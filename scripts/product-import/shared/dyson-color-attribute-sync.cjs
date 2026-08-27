/**
 * Ensure Dyson color Attribute / AttributeValue / ProductVariantOption / ProductAttribute.
 * Scoped helpers — caller must already confirm brand is Dyson.
 */

"use strict";

const { normalizeColorKey } = require("./dyson-color-registry.cjs");
const {
  LOCALES,
  ensureColorAttribute,
  ensureVariantColorOption,
  ensureProductColorAttribute,
  mergeAttributesColor,
} = require("./catalog-color-attribute-sync.cjs");

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

module.exports = {
  ensureColorAttribute,
  findExistingColorAttributeValue,
  ensureDysonAttributeValue,
  ensureDysonVariantColorOption: ensureVariantColorOption,
  ensureDysonProductAttribute: ensureProductColorAttribute,
  mergeAttributesColor,
  LOCALES,
};
