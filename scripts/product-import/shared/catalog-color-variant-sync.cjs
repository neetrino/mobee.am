/**
 * Write relational color option after productVariant.create / backfill.
 */

"use strict";

const { recoverCatalogColorFromEvidence } = require("./catalog-color-recover.cjs");
const {
  ensureColorAttribute,
  ensureCatalogColorValue,
  ensureVariantColorOption,
  ensureProductColorAttribute,
  mergeAttributesColor,
} = require("./catalog-color-attribute-sync.cjs");

async function writeColorOptionPlan(prisma, args, apply, avResult, attr) {
  const optionResult = avResult.attributeValueId
    ? await ensureVariantColorOption(prisma, {
        variantId: args.variantId,
        attributeId: attr.id,
        attributeValueId: avResult.attributeValueId,
        canonicalName: avResult.value,
        apply,
      })
    : { action: "create", optionId: null };

  const productAttributeResult = await ensureProductColorAttribute(
    prisma,
    args.productId,
    attr.id,
    apply,
  );

  if (apply) {
    await prisma.productVariant.update({
      where: { id: args.variantId },
      data: { attributes: mergeAttributesColor(args.attributes, avResult.value) },
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
 *   media?: unknown,
 *   name?: string | null,
 *   apply?: boolean,
 * }} args
 */
async function syncCatalogVariantColor(prisma, args) {
  const apply = args.apply !== false;
  const colorName = recoverCatalogColorFromEvidence({
    attributes: args.attributes,
    media: args.media,
    name: args.name,
  });
  if (!colorName) {
    return { status: "skip_no_color" };
  }

  const attr = await ensureColorAttribute(prisma);
  const avResult = await ensureCatalogColorValue(prisma, attr.id, colorName, { apply });
  if (apply && !avResult.attributeValueId) {
    throw new Error(`Missing AttributeValue id after apply for ${colorName}`);
  }

  const { optionResult, productAttributeResult } = await writeColorOptionPlan(
    prisma,
    args,
    apply,
    avResult,
    attr,
  );

  return {
    status: optionResult.action === "manual_review" ? "manual_review" : "ok",
    colorName: avResult.value,
    attributeValueAction: avResult.action,
    variantOptionAction: optionResult.action,
    productAttributeAction: productAttributeResult.action,
    reason: optionResult.reason || null,
  };
}

module.exports = { syncCatalogVariantColor };
