/**
 * Catalog color source of truth: AttributeValue + ProductVariantOption.
 * JSONB ProductVariant.attributes is a denormalized copy kept in sync on write.
 */

"use strict";

const { compactColorKey, hexesForColorName } = require("./catalog-color-hex.cjs");

const LOCALES = ["en", "hy", "ru"];

/** @type {Map<string, object[]>} */
const colorValueCache = new Map();

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureColorAttribute(prisma) {
  let attr = await prisma.attribute.findUnique({ where: { key: "color" } });
  if (attr) return attr;
  return prisma.attribute.create({
    data: {
      key: "color",
      type: "select",
      filterable: true,
      position: 0,
      translations: {
        create: LOCALES.map((locale) => ({ locale, name: "Color" })),
      },
    },
  });
}

async function loadColorValues(prisma, attributeId) {
  const cached = colorValueCache.get(attributeId);
  if (cached) return cached;
  const values = await prisma.attributeValue.findMany({
    where: { attributeId },
    include: { translations: true },
  });
  colorValueCache.set(attributeId, values);
  return values;
}

function findCachedColorValue(values, colorName) {
  const target = compactColorKey(colorName);
  if (!target) return null;
  const matches = values.filter((av) => {
    const candidates = [av.value, ...av.translations.map((t) => t.label)];
    return candidates.some((label) => compactColorKey(label) === target);
  });
  if (matches.length === 0) return null;
  const exact = matches.find((item) => compactColorKey(item.value) === target);
  const withColors = matches.find(
    (item) => Array.isArray(item.colors) && item.colors.length > 0,
  );
  return exact || withColors || matches[0];
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 * @param {string} colorName
 * @param {{ apply: boolean }} opts
 */
async function ensureCatalogColorValue(prisma, attributeId, colorName, opts) {
  const values = await loadColorValues(prisma, attributeId);
  const match = findCachedColorValue(values, colorName);
  const hexes = hexesForColorName(match?.value || colorName);

  if (match) {
    return reuseOrFillColorValue(prisma, match, hexes, opts);
  }

  if (!opts.apply) {
    return {
      action: "create",
      attributeValueId: null,
      value: colorName,
      colors: hexes,
    };
  }

  const posCount = await prisma.attributeValue.count({ where: { attributeId } });
  const created = await prisma.attributeValue.create({
    data: {
      attributeId,
      value: colorName,
      position: posCount,
      colors: hexes.length ? hexes : undefined,
      translations: {
        create: LOCALES.map((locale) => ({ locale, label: colorName })),
      },
    },
  });
  values.push({ ...created, translations: LOCALES.map((locale) => ({ locale, label: colorName })) });
  return {
    action: "create",
    attributeValueId: created.id,
    value: created.value,
    colors: hexes,
  };
}

async function reuseOrFillColorValue(prisma, match, hexes, opts) {
  const current = Array.isArray(match.colors) ? match.colors : [];
  const needsColors = current.length === 0 && hexes.length > 0;
  if (!opts.apply) {
    return {
      action: needsColors ? "update" : "reuse",
      attributeValueId: match.id,
      value: match.value,
      colors: needsColors ? hexes : current,
    };
  }
  if (needsColors) {
    const updated = await prisma.attributeValue.update({
      where: { id: match.id },
      data: { colors: hexes },
    });
    match.colors = hexes;
    return {
      action: "update",
      attributeValueId: updated.id,
      value: updated.value,
      colors: hexes,
    };
  }
  return {
    action: "reuse",
    attributeValueId: match.id,
    value: match.value,
    colors: current,
  };
}

function listVariantColorOptions(existing, attributeId) {
  return existing.filter(
    (option) =>
      option.attributeKey === "color" ||
      option.attributeKey === "colour" ||
      option.attributeId === attributeId,
  );
}

async function updateColorOptionIfNeeded(prisma, opt, args) {
  const needsUpdate =
    opt.valueId !== args.attributeValueId ||
    opt.value !== args.canonicalName ||
    opt.attributeKey !== "color" ||
    opt.attributeId !== args.attributeId;
  if (!args.apply) {
    return { action: needsUpdate ? "update" : "reuse", optionId: opt.id };
  }
  if (!needsUpdate) {
    return { action: "reuse", optionId: opt.id };
  }
  await prisma.productVariantOption.update({
    where: { id: opt.id },
    data: {
      attributeId: args.attributeId,
      attributeKey: "color",
      valueId: args.attributeValueId,
      value: args.canonicalName,
    },
  });
  return { action: "update", optionId: opt.id };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   variantId: string,
 *   attributeId: string,
 *   attributeValueId: string,
 *   canonicalName: string,
 *   apply: boolean,
 * }} args
 */
async function ensureVariantColorOption(prisma, args) {
  const existing = await prisma.productVariantOption.findMany({
    where: {
      variantId: args.variantId,
      OR: [
        { attributeKey: "color" },
        { attributeKey: "colour" },
        { attributeId: args.attributeId },
      ],
    },
  });
  const colorOptions = listVariantColorOptions(existing, args.attributeId);
  if (colorOptions.length > 1) {
    return {
      action: "manual_review",
      reason: "multiple_color_options_on_variant",
      optionIds: colorOptions.map((option) => option.id),
    };
  }
  if (colorOptions.length === 1) {
    return updateColorOptionIfNeeded(prisma, colorOptions[0], args);
  }
  if (!args.apply) {
    return { action: "create", optionId: null };
  }
  const created = await prisma.productVariantOption.create({
    data: {
      variantId: args.variantId,
      attributeId: args.attributeId,
      attributeKey: "color",
      valueId: args.attributeValueId,
      value: args.canonicalName,
    },
  });
  return { action: "create", optionId: created.id };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} productId
 * @param {string} attributeId
 * @param {boolean} apply
 */
async function ensureProductColorAttribute(prisma, productId, attributeId, apply) {
  const existing = await prisma.productAttribute.findUnique({
    where: { productId_attributeId: { productId, attributeId } },
  });
  if (existing) {
    return { action: "reuse", productAttributeId: existing.id };
  }
  if (!apply) {
    return { action: "create", productAttributeId: null };
  }
  const created = await prisma.productAttribute.create({
    data: { productId, attributeId },
  });
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { attributeIds: true },
  });
  const nextIds = Array.from(new Set([...(product?.attributeIds || []), attributeId]));
  await prisma.product.update({
    where: { id: productId },
    data: { attributeIds: nextIds },
  });
  return { action: "create", productAttributeId: created.id };
}

function mergeAttributesColor(attributes, canonicalName) {
  const base =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? { ...attributes }
      : {};
  base.color = canonicalName;
  return base;
}

module.exports = {
  LOCALES,
  ensureColorAttribute,
  ensureCatalogColorValue,
  ensureVariantColorOption,
  ensureProductColorAttribute,
  mergeAttributesColor,
};
