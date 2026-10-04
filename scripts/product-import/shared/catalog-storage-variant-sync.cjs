/**
 * Write relational storage option after import / backfill.
 */

"use strict";

const {
  extractStorageFromAttributes,
  ensureStorageAttribute,
  ensureCatalogStorageValue,
  ensureVariantStorageOption,
  ensureProductStorageAttribute,
  mergeAttributesStorage,
} = require("./catalog-storage-attribute-sync.cjs");

async function writeStorageOptionPlan(prisma, args, apply, avResult, attr) {
  const optionResult = avResult.attributeValueId
    ? await ensureVariantStorageOption(prisma, {
        variantId: args.variantId,
        attributeId: attr.id,
        attributeValueId: avResult.attributeValueId,
        canonicalName: avResult.value,
        apply,
      })
    : { action: "create", optionId: null };

  const productAttributeResult = await ensureProductStorageAttribute(
    prisma,
    args.productId,
    attr.id,
    apply,
  );

  if (apply) {
    await prisma.productVariant.update({
      where: { id: args.variantId },
      data: { attributes: mergeAttributesStorage(args.attributes, avResult.value) },
    });
  }

  return { optionResult, productAttributeResult };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   productId: string,
 *   variantId: string,
 *   attributes?: unknown,
 *   storageLabel?: string | null,
 *   apply?: boolean,
 * }} args
 */
async function syncCatalogVariantStorage(prisma, args) {
  const apply = args.apply !== false;
  const storageLabel =
    args.storageLabel || extractStorageFromAttributes(args.attributes);
  if (!storageLabel) {
    return { status: "skip_no_storage" };
  }

  const attr = await ensureStorageAttribute(prisma);
  const avResult = await ensureCatalogStorageValue(prisma, attr.id, storageLabel, {
    apply,
  });
  if (apply && !avResult.attributeValueId) {
    throw new Error(`Missing AttributeValue id after apply for ${storageLabel}`);
  }

  const { optionResult, productAttributeResult } = await writeStorageOptionPlan(
    prisma,
    args,
    apply,
    avResult,
    attr,
  );

  return {
    status: optionResult.action === "manual_review" ? "manual_review" : "ok",
    storageLabel: avResult.value,
    attributeValueAction: avResult.action,
    variantOptionAction: optionResult.action,
    productAttributeAction: productAttributeResult.action,
    reason: optionResult.reason || null,
  };
}

module.exports = { syncCatalogVariantStorage };
