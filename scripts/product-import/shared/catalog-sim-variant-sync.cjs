/**
 * Write relational SIM option after import / backfill.
 */

"use strict";

const {
  extractSimFromAttributes,
  ensureSimAttribute,
  ensureCatalogSimValue,
  ensureVariantSimOption,
  ensureProductSimAttribute,
  mergeAttributesSim,
} = require("./catalog-sim-attribute-sync.cjs");

async function writeSimOptionPlan(prisma, args, apply, avResult, attr) {
  const optionResult = avResult.attributeValueId
    ? await ensureVariantSimOption(prisma, {
        variantId: args.variantId,
        attributeId: attr.id,
        attributeValueId: avResult.attributeValueId,
        canonicalName: avResult.value,
        apply,
      })
    : { action: "create", optionId: null };

  const productAttributeResult = await ensureProductSimAttribute(
    prisma,
    args.productId,
    attr.id,
    apply,
  );

  if (apply) {
    await prisma.productVariant.update({
      where: { id: args.variantId },
      data: { attributes: mergeAttributesSim(args.attributes, avResult.value) },
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
 *   simLabel?: string | null,
 *   apply?: boolean,
 * }} args
 */
async function syncCatalogVariantSim(prisma, args) {
  const apply = args.apply !== false;
  const simLabel = args.simLabel || extractSimFromAttributes(args.attributes);
  if (!simLabel) {
    return { status: "skip_no_sim" };
  }

  const attr = await ensureSimAttribute(prisma);
  const avResult = await ensureCatalogSimValue(prisma, attr.id, simLabel, { apply });
  if (apply && !avResult.attributeValueId) {
    throw new Error(`Missing AttributeValue id after apply for ${simLabel}`);
  }

  const { optionResult, productAttributeResult } = await writeSimOptionPlan(
    prisma,
    args,
    apply,
    avResult,
    attr,
  );

  return {
    status: optionResult.action === "manual_review" ? "manual_review" : "ok",
    simLabel: avResult.value,
    attributeValueAction: avResult.action,
    variantOptionAction: optionResult.action,
    productAttributeAction: productAttributeResult.action,
    reason: optionResult.reason || null,
  };
}

module.exports = { syncCatalogVariantSim };
