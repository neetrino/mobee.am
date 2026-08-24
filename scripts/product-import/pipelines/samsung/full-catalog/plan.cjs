"use strict";

const { SAMSUNG_PHONE_WHITELIST } = require("../whitelist.constants.cjs");
const { checkVariantExists } = require("../check-existing-db.cjs");
const { variantDedupeKey, slugify } = require("../normalize.cjs");
const { normalizeVariantOptions } = require("../../../shared/samsung-attribute-normalize.cjs");
const { findDbProduct } = require("./db-catalog.cjs");

function sourceScore(product) {
  const variantScore = (product.variant_count || 0) * 10;
  const descriptionScore = product.descriptionHtml ? 100 : 0;
  const galleryScore = (product.gallery?.length || 0) > 0 ? 5 : 0;
  return variantScore + descriptionScore + galleryScore;
}

function pickBestSource(mcByModel, ymByModel, model, dbProduct) {
  const mc = mcByModel.get(model);
  const ym = ymByModel.get(model);
  if (!mc && !ym) return null;
  if (mc && !ym) return mc;
  if (ym && !mc) return ym;

  if (dbProduct?.variants?.length) {
    const sourceCounts = dbProduct.variants.reduce((acc, variant) => {
      const key = variant.source || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const primarySource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (primarySource === "mobilecentre" && mc) return mc;
    if (primarySource === "yerevanmobile" && ym) return ym;
  }

  return sourceScore(mc) >= sourceScore(ym) ? mc : ym;
}

function matchParsedVariantToDb(parsedVariant, dbVariants) {
  const key = parsedVariant.dedupe_key || variantDedupeKey(parsedVariant);
  const byKey = dbVariants.find((variant) => variant.dedupe_key === key);
  if (byKey) return byKey;

  if (parsedVariant.source_pid) {
    const byPid = dbVariants.find(
      (variant) =>
        String(variant.sourcePid || "") === String(parsedVariant.source_pid) &&
        variant.source === parsedVariant.source,
    );
    if (byPid) return byPid;
  }
  return null;
}

function variantNeedsAttributeUpdate(dbVariant, parsedVariant) {
  const dbAttrs = normalizeVariantOptions(dbVariant.attributes || {});
  const parsedAttrs = normalizeVariantOptions(parsedVariant.options || {});
  for (const [key, value] of Object.entries(parsedAttrs)) {
    if (!value) continue;
    if (!dbAttrs[key] || dbAttrs[key] !== value) return true;
  }
  return Object.keys(parsedAttrs).length > 0 && Object.keys(dbAttrs).length === 0;
}

function planProduct(model, parsed, dbCatalog) {
  const dbProduct = findDbProduct(dbCatalog, model);
  const parsedVariants = parsed?.variants || [];
  const parsedMediaCount = Math.max(
    parsed?.gallery?.length || 0,
    ...parsedVariants.map((variant) => (variant.gallery?.length || 0) + (variant.image_url ? 1 : 0)),
    0,
  );

  const base = {
    product_name: model,
    slug: slugify(model),
    source: parsed?.source || null,
    sourceUrl: parsed?.sourceUrl || parsed?.source_urls?.[0] || null,
    db_status: dbProduct ? "existing" : "new",
    db_product_id: dbProduct?.id || null,
    before: {
      variants_count: dbProduct?.variants.length || 0,
      descriptionHtml_length: dbProduct?.descriptionHtml_length || 0,
      media_count: dbProduct?.media_count || 0,
    },
    parsed: {
      variants_count: parsedVariants.length,
      descriptionHtml_length: parsed?.descriptionHtml?.length || 0,
      media_count: parsedMediaCount,
    },
    reject_reason: null,
    parser_error: null,
    proposed_action: "manual_review",
    actions: {
      create_product: false,
      update_description: false,
      variants_to_create: [],
      variants_to_update: [],
      generic_variants_to_retire: [],
      preserve_existing: false,
    },
  };

  if (!parsed) {
    return {
      ...base,
      db_status: dbProduct ? "existing" : "new",
      proposed_action: dbProduct ? "preserve_existing" : "manual_review",
      parser_error: "source_not_found",
      actions: { ...base.actions, preserve_existing: Boolean(dbProduct) },
    };
  }

  if (!parsed.validation_ok || !parsedVariants.length) {
    return {
      ...base,
      proposed_action: "reject",
      reject_reason: "no_valid_variants",
    };
  }

  const variantsToCreate = [];
  const variantsToUpdate = [];
  const genericToRetire = [];

  if (dbProduct) {
    for (const parsedVariant of parsedVariants) {
      const dbMatch = matchParsedVariantToDb(parsedVariant, dbProduct.variants);
      if (!dbMatch) {
        variantsToCreate.push(parsedVariant);
        continue;
      }
      if (variantNeedsAttributeUpdate(dbMatch, parsedVariant)) {
        variantsToUpdate.push({ parsed: parsedVariant, db: dbMatch });
      }
    }

    const genericVariants = dbProduct.variants.filter((variant) => variant.generic);
    if (genericVariants.length && parsedVariants.length > 1) {
      for (const generic of genericVariants) {
        const covered = parsedVariants.some((parsedVariant) => {
          const match = matchParsedVariantToDb(parsedVariant, [generic]);
          return Boolean(match);
        });
        if (!covered) {
          genericToRetire.push({
            variant_id: generic.id,
            sku: generic.sku,
            has_refs: generic.has_refs,
            safe_to_unpublish: !generic.has_refs,
          });
        }
      }
    }

    const needsDescription =
      (!dbProduct.descriptionHtml || dbProduct.descriptionHtml_length < 100) &&
      parsed.descriptionHtml &&
      parsed.descriptionHtml.length > 100;

    const hasWork =
      variantsToCreate.length > 0 ||
      variantsToUpdate.length > 0 ||
      needsDescription ||
      genericToRetire.some((row) => row.safe_to_unpublish);

    if (!hasWork) {
      return {
        ...base,
        proposed_action: "preserve_existing",
        actions: { ...base.actions, preserve_existing: true },
      };
    }

    const blockedRetire = genericToRetire.some((row) => row.has_refs && parsedVariants.length > 1);
    let proposed_action = "update_variants";
    if (variantsToCreate.length && variantsToUpdate.length === 0 && !needsDescription) {
      proposed_action = "update_variants";
    } else if (needsDescription && variantsToCreate.length === 0) {
      proposed_action = "update_description";
    } else if (needsDescription && variantsToCreate.length > 0) {
      proposed_action = "update_variants";
    }
    if (blockedRetire) proposed_action = "manual_review";

    return {
      ...base,
      proposed_action,
      actions: {
        create_product: false,
        update_description: needsDescription,
        variants_to_create: variantsToCreate,
        variants_to_update: variantsToUpdate,
        generic_variants_to_retire: genericToRetire,
        preserve_existing: false,
      },
    };
  }

  for (const parsedVariant of parsedVariants) {
    const dup = checkVariantExists(
      dbCatalog.map((entry) => ({
        ...entry,
        variants: entry.variants,
      })),
      parsedVariant,
    );
    if (!dup.exists) variantsToCreate.push(parsedVariant);
  }

  if (!variantsToCreate.length) {
    return {
      ...base,
      db_status: "duplicate",
      proposed_action: "skip_duplicate",
      actions: { ...base.actions, preserve_existing: true },
    };
  }

  return {
    ...base,
    proposed_action: "create_product",
    actions: {
      create_product: true,
      update_description: Boolean(parsed.descriptionHtml),
      variants_to_create: variantsToCreate,
      variants_to_update: [],
      generic_variants_to_retire: [],
      preserve_existing: false,
    },
  };
}

function buildCatalogPlan({ mcCatalog, ymCatalog, dbCatalog, rejected = [], notFound = [], parserIssues = [] }) {
  const mcByModel = new Map(mcCatalog.discovered.map((row) => [row.model, row]));
  const ymByModel = new Map(ymCatalog.discovered.map((row) => [row.model, row]));

  const readyNew = [];
  const readyBackfill = [];
  const alreadyComplete = [];
  const duplicatesSkipped = [];
  const rejectedRows = [...rejected, ...ymCatalog.rejected];
  const sourceNotFound = [];
  const manualReview = [...ymCatalog.manualReview];
  const products = [];
  const parsedCatalog = {};

  for (const model of SAMSUNG_PHONE_WHITELIST) {
    const parsed = pickBestSource(mcByModel, ymByModel, model, findDbProduct(dbCatalog, model));
    if (parsed) parsedCatalog[model] = parsed;
    const plan = planProduct(model, parsed, dbCatalog);
    products.push(plan);

    if (plan.parser_error === "source_not_found") {
      sourceNotFound.push({ model, reason: "no_source_match" });
      if (plan.db_status === "existing") alreadyComplete.push(plan);
      else manualReview.push({ model, reason: "missing_source_for_new_model" });
      continue;
    }

    switch (plan.proposed_action) {
      case "create_product":
        readyNew.push(plan);
        break;
      case "update_variants":
      case "update_description":
        readyBackfill.push(plan);
        break;
      case "preserve_existing":
        alreadyComplete.push(plan);
        break;
      case "skip_duplicate":
        duplicatesSkipped.push(plan);
        break;
      case "reject":
        rejectedRows.push({ model, source: plan.source, reason: plan.reject_reason });
        break;
      case "manual_review":
        manualReview.push({ model, source: plan.source, reason: plan.parser_error || "needs_review" });
        break;
      default:
        break;
    }
  }

  for (const row of notFound) sourceNotFound.push(row);
  for (const row of parserIssues) sourceNotFound.push(row);

  const duplicateVariantKeys = new Set();
  const duplicateKeys = [];
  for (const product of [...readyNew, ...readyBackfill]) {
    for (const variant of product.actions.variants_to_create) {
      const key = variant.dedupe_key || variantDedupeKey(variant);
      if (duplicateVariantKeys.has(key)) duplicateKeys.push({ model: product.product_name, key });
      duplicateVariantKeys.add(key);
    }
  }

  const hasParserErrors = parserIssues.length > 0;
  const hasBlockedRetire = products.some((product) =>
    product.actions.generic_variants_to_retire.some((row) => row.has_refs),
  );

  return {
    generated_at: new Date().toISOString(),
    summary: {
      whitelist_models: SAMSUNG_PHONE_WHITELIST.length,
      ready_new_products: readyNew.length,
      ready_backfill_products: readyBackfill.length,
      already_complete: alreadyComplete.length,
      duplicates_skipped: duplicatesSkipped.length,
      rejected: rejectedRows.length,
      source_not_found: sourceNotFound.length,
      manual_review: manualReview.length,
      parser_errors: parserIssues.length,
      duplicate_variant_keys: duplicateKeys.length,
      apply_blocked: hasParserErrors || duplicateKeys.length > 0,
    },
    sections: {
      ready_new: readyNew,
      ready_backfill: readyBackfill,
      already_complete: alreadyComplete,
      duplicates_skipped: duplicatesSkipped,
      rejected: rejectedRows,
      source_not_found: sourceNotFound,
      manual_review: manualReview,
      parser_issues: parserIssues,
    },
    products,
    parsed_catalog: parsedCatalog,
    safety: {
      has_parser_errors: hasParserErrors,
      has_duplicate_variant_keys: duplicateKeys.length > 0,
      duplicate_variant_keys: duplicateKeys,
      variants_with_cart_order_refs: products.flatMap((product) =>
        product.actions.generic_variants_to_retire.filter((row) => row.has_refs),
      ),
      blocked_retire_due_to_refs: hasBlockedRetire,
    },
    sources: {
      mobilecentre: mcCatalog.discovered.length,
      yerevanmobile: ymCatalog.discovered.length,
    },
  };
}

module.exports = { buildCatalogPlan, pickBestSource, planProduct };
