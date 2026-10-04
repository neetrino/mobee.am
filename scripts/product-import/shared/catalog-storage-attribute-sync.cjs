/**
 * Catalog storage source of truth: AttributeValue + ProductVariantOption.
 * JSONB ProductVariant.attributes.storage is a denormalized copy kept in sync on write.
 */

"use strict";

const LOCALES = ["en", "hy", "ru"];
const STORAGE_ATTRIBUTE_NAMES = {
  en: "Storage",
  hy: "Պահեստ",
  ru: "Память",
};

/** @type {Map<string, object[]>} */
const storageValueCache = new Map();

/**
 * Canonical catalog form: "128GB", "1TB" (no space), matching existing AttributeValue rows.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeStorageLabel(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const compact = text.replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^(\d+(?:\.\d+)?)(GB|TB|MB)$/);
  if (!match) return text.replace(/\s+/g, " ").trim();
  return `${match[1]}${match[2]}`;
}

/**
 * @param {unknown} attributes
 * @returns {string | null}
 */
function extractStorageFromAttributes(attributes) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const record = /** @type {Record<string, unknown>} */ (attributes);
  const raw = record.storage ?? record.memory;
  if (raw == null) return null;
  if (typeof raw === "string") return normalizeStorageLabel(raw);
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string") return normalizeStorageLabel(first);
    if (first && typeof first === "object" && "value" in first) {
      return normalizeStorageLabel(/** @type {{ value: unknown }} */ (first).value);
    }
  }
  return null;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureStorageAttribute(prisma) {
  let attr = await prisma.attribute.findUnique({ where: { key: "storage" } });
  if (attr) return attr;
  return prisma.attribute.create({
    data: {
      key: "storage",
      type: "select",
      filterable: true,
      position: 1,
      translations: {
        create: LOCALES.map((locale) => ({
          locale,
          name: STORAGE_ATTRIBUTE_NAMES[locale] || STORAGE_ATTRIBUTE_NAMES.en,
        })),
      },
    },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 */
async function loadStorageValues(prisma, attributeId) {
  const cached = storageValueCache.get(attributeId);
  if (cached) return cached;
  const values = await prisma.attributeValue.findMany({
    where: { attributeId },
    include: { translations: true },
  });
  storageValueCache.set(attributeId, values);
  return values;
}

/**
 * @param {object[]} values
 * @param {string} storageLabel
 */
function findCachedStorageValue(values, storageLabel) {
  const target = normalizeStorageLabel(storageLabel);
  if (!target) return null;
  const matches = values.filter((av) => {
    const candidates = [av.value, ...av.translations.map((t) => t.label)];
    return candidates.some((label) => normalizeStorageLabel(label) === target);
  });
  if (matches.length === 0) return null;
  const exact = matches.find((item) => normalizeStorageLabel(item.value) === target);
  return exact || matches[0];
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 * @param {string} storageLabel
 * @param {{ apply: boolean }} opts
 */
async function ensureCatalogStorageValue(prisma, attributeId, storageLabel, opts) {
  const canonical = normalizeStorageLabel(storageLabel);
  if (!canonical) {
    return { action: "skip", attributeValueId: null, value: null };
  }

  const values = await loadStorageValues(prisma, attributeId);
  const match = findCachedStorageValue(values, canonical);
  if (match) {
    return {
      action: "reuse",
      attributeValueId: match.id,
      value: match.value,
    };
  }

  if (!opts.apply) {
    return {
      action: "create",
      attributeValueId: null,
      value: canonical,
    };
  }

  const posCount = await prisma.attributeValue.count({ where: { attributeId } });
  const created = await prisma.attributeValue.create({
    data: {
      attributeId,
      value: canonical,
      position: posCount,
      translations: {
        create: LOCALES.map((locale) => ({ locale, label: canonical })),
      },
    },
  });
  values.push({
    ...created,
    translations: LOCALES.map((locale) => ({ locale, label: canonical })),
  });
  return {
    action: "create",
    attributeValueId: created.id,
    value: created.value,
  };
}

function listVariantStorageOptions(existing) {
  // Query already scopes to storage keys / storage AttributeValue links.
  return existing;
}

async function updateStorageOptionIfNeeded(prisma, opt, args) {
  const needsUpdate =
    opt.valueId !== args.attributeValueId ||
    opt.value !== args.canonicalName ||
    opt.attributeKey !== "storage" ||
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
      attributeKey: "storage",
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
async function ensureVariantStorageOption(prisma, args) {
  const existing = await prisma.productVariantOption.findMany({
    where: {
      variantId: args.variantId,
      OR: [
        { attributeKey: "storage" },
        { attributeKey: "memory" },
        { attributeId: args.attributeId },
        { valueId: args.attributeValueId },
        { attributeValue: { attributeId: args.attributeId } },
      ],
    },
  });
  const storageOptions = listVariantStorageOptions(existing);
  if (storageOptions.length > 1) {
    return {
      action: "manual_review",
      reason: "multiple_storage_options_on_variant",
      optionIds: storageOptions.map((option) => option.id),
    };
  }
  if (storageOptions.length === 1) {
    return updateStorageOptionIfNeeded(prisma, storageOptions[0], args);
  }
  if (!args.apply) {
    return { action: "create", optionId: null };
  }
  const created = await prisma.productVariantOption.create({
    data: {
      variantId: args.variantId,
      attributeId: args.attributeId,
      attributeKey: "storage",
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
async function ensureProductStorageAttribute(prisma, productId, attributeId, apply) {
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

function mergeAttributesStorage(attributes, canonicalName) {
  const base =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? { ...attributes }
      : {};
  base.storage = canonicalName;
  if ("memory" in base) {
    delete base.memory;
  }
  return base;
}

module.exports = {
  LOCALES,
  normalizeStorageLabel,
  extractStorageFromAttributes,
  ensureStorageAttribute,
  ensureCatalogStorageValue,
  ensureVariantStorageOption,
  ensureProductStorageAttribute,
  mergeAttributesStorage,
};
