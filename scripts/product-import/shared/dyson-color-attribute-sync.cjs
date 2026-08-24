/**
 * Ensure Dyson color Attribute / AttributeValue / ProductVariantOption / ProductAttribute.
 * Scoped helpers — caller must already confirm brand is Dyson.
 */

"use strict";

const { normalizeColorKey } = require("./dyson-color-registry.cjs");

const LOCALES = ["en", "hy", "ru"];

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureColorAttribute(prisma) {
  let attr = await prisma.attribute.findUnique({ where: { key: "color" } });
  if (!attr) {
    attr = await prisma.attribute.create({
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
  return attr;
}

/**
 * Find existing AttributeValue for a canonical Dyson color without creating duplicates.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 * @param {{ canonicalName: string, aliases: string[] }} entry
 */
async function findExistingColorAttributeValue(prisma, attributeId, entry) {
  const keys = new Set([
    normalizeColorKey(entry.canonicalName),
    ...entry.aliases.map((a) => normalizeColorKey(a)),
  ]);

  const values = await prisma.attributeValue.findMany({
    where: { attributeId },
    include: { translations: true },
  });

  /** @type {typeof values} */
  const matches = [];
  for (const av of values) {
    const candidates = [av.value, ...av.translations.map((t) => t.label)];
    if (candidates.some((c) => keys.has(normalizeColorKey(c)))) {
      matches.push(av);
    }
  }

  if (matches.length === 0) return { match: null, duplicateRisk: false, matches: [] };
  if (matches.length > 1) {
    // Prefer exact canonical value, then any with non-empty colors
    const exact = matches.find((m) => normalizeColorKey(m.value) === normalizeColorKey(entry.canonicalName));
    const withColors = matches.find((m) => Array.isArray(m.colors) && m.colors.length > 0);
    return {
      match: exact || withColors || matches[0],
      duplicateRisk: true,
      matches,
    };
  }
  return { match: matches[0], duplicateRisk: false, matches };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 * @param {{ canonicalName: string, colors: string[], aliases: string[] }} entry
 * @param {{ apply: boolean }} opts
 */
async function ensureDysonAttributeValue(prisma, attributeId, entry, opts) {
  const found = await findExistingColorAttributeValue(prisma, attributeId, entry);
  if (found.match) {
    const current = Array.isArray(found.match.colors) ? found.match.colors : [];
    const needsColors =
      current.length === 0 ||
      JSON.stringify(current.map(String)) !== JSON.stringify(entry.colors.map(String));
    const needsRename =
      normalizeColorKey(found.match.value) !== normalizeColorKey(entry.canonicalName);

    // Never rewrite shared generic names (Pink, Blue, …) to Dyson compounds.
    const valueKey = normalizeColorKey(found.match.value);
    const isGenericShared =
      valueKey === "pink" ||
      valueKey === "blue" ||
      valueKey === "ceramic" ||
      valueKey === "vinca" ||
      valueKey === "gold" ||
      valueKey === "copper" ||
      valueKey === "nickel";

    if (isGenericShared) {
      // Create a distinct Dyson AttributeValue instead of mutating shared Pink/Blue.
      if (!opts.apply) {
        return {
          action: "create",
          attributeValueId: null,
          value: entry.canonicalName,
          colors: entry.colors,
          duplicateRisk: found.duplicateRisk,
          note: "avoid_mutating_shared_generic_attribute_value",
        };
      }
      const posCount = await prisma.attributeValue.count({ where: { attributeId } });
      const created = await prisma.attributeValue.create({
        data: {
          attributeId,
          value: entry.canonicalName,
          position: posCount,
          colors: entry.colors,
          translations: {
            create: LOCALES.map((locale) => ({ locale, label: entry.canonicalName })),
          },
        },
      });
      return {
        action: "create",
        attributeValueId: created.id,
        value: created.value,
        colors: entry.colors,
        duplicateRisk: false,
      };
    }

    if (!opts.apply) {
      return {
        action: needsColors || needsRename ? "update" : "reuse",
        attributeValueId: found.match.id,
        value: entry.canonicalName,
        colors: entry.colors,
        duplicateRisk: found.duplicateRisk,
        previousValue: found.match.value,
        previousColors: current,
      };
    }

    const updated = await prisma.attributeValue.update({
      where: { id: found.match.id },
      data: {
        value: entry.canonicalName,
        colors: entry.colors,
      },
    });

    const enTranslation = found.match.translations.find((t) => t.locale === "en");
    if (enTranslation && enTranslation.label !== entry.canonicalName) {
      await prisma.attributeValueTranslation.update({
        where: { id: enTranslation.id },
        data: { label: entry.canonicalName },
      });
    } else if (!enTranslation) {
      await prisma.attributeValueTranslation.create({
        data: { attributeValueId: found.match.id, locale: "en", label: entry.canonicalName },
      });
    }

    return {
      action: needsColors || needsRename ? "update" : "reuse",
      attributeValueId: updated.id,
      value: updated.value,
      colors: entry.colors,
      duplicateRisk: found.duplicateRisk,
    };
  }

  if (!opts.apply) {
    return {
      action: "create",
      attributeValueId: null,
      value: entry.canonicalName,
      colors: entry.colors,
      duplicateRisk: false,
    };
  }

  const posCount = await prisma.attributeValue.count({ where: { attributeId } });
  const created = await prisma.attributeValue.create({
    data: {
      attributeId,
      value: entry.canonicalName,
      position: posCount,
      colors: entry.colors,
      translations: {
        create: LOCALES.map((locale) => ({ locale, label: entry.canonicalName })),
      },
    },
  });

  return {
    action: "create",
    attributeValueId: created.id,
    value: created.value,
    colors: entry.colors,
    duplicateRisk: false,
  };
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
async function ensureDysonVariantColorOption(prisma, args) {
  const existing = await prisma.productVariantOption.findMany({
    where: {
      variantId: args.variantId,
      OR: [{ attributeKey: "color" }, { attributeKey: "colour" }, { attributeId: args.attributeId }],
    },
  });

  const colorOptions = existing.filter(
    (o) =>
      o.attributeKey === "color" ||
      o.attributeKey === "colour" ||
      o.attributeId === args.attributeId,
  );

  if (colorOptions.length > 1) {
    return {
      action: "manual_review",
      reason: "multiple_color_options_on_variant",
      optionIds: colorOptions.map((o) => o.id),
    };
  }

  if (colorOptions.length === 1) {
    const opt = colorOptions[0];
    const needsUpdate =
      opt.valueId !== args.attributeValueId ||
      opt.value !== args.canonicalName ||
      opt.attributeKey !== "color" ||
      opt.attributeId !== args.attributeId;

    if (!args.apply) {
      return {
        action: needsUpdate ? "update" : "reuse",
        optionId: opt.id,
      };
    }

    if (needsUpdate) {
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
    return { action: "reuse", optionId: opt.id };
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
async function ensureDysonProductAttribute(prisma, productId, attributeId, apply) {
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

/**
 * Merge canonical color into ProductVariant.attributes JSON without dropping other keys.
 * @param {unknown} attributes
 * @param {string} canonicalName
 */
function mergeAttributesColor(attributes, canonicalName) {
  const base =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? { ...attributes }
      : {};
  base.color = canonicalName;
  return base;
}

module.exports = {
  ensureColorAttribute,
  findExistingColorAttributeValue,
  ensureDysonAttributeValue,
  ensureDysonVariantColorOption,
  ensureDysonProductAttribute,
  mergeAttributesColor,
  LOCALES,
};
