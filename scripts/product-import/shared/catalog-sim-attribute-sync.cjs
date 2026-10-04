/**
 * Catalog SIM source of truth: AttributeValue + ProductVariantOption.
 * JSONB ProductVariant.attributes.sim is a denormalized copy kept in sync on write.
 */

"use strict";

const LOCALES = ["en", "hy", "ru"];
const SIM_ATTRIBUTE_NAMES = {
  en: "SIM",
  hy: "SIM",
  ru: "SIM",
};

/** Known aliases → canonical catalog labels. */
const SIM_ALIASES = new Map([
  ["dualesim", "Dual eSIM"],
  ["2esim", "Dual eSIM"],
  ["dual esim", "Dual eSIM"],
  ["nanosim&esim", "Nano-SIM & eSIM"],
  ["nano-sim&esim", "Nano-SIM & eSIM"],
  ["sim+esim", "Nano-SIM & eSIM"],
  ["sim + esim", "Nano-SIM & eSIM"],
  ["nano-sim + esim", "Nano-SIM & eSIM"],
  ["esim", "eSIM"],
  ["nano-sim", "Nano-SIM"],
  ["nanosim", "Nano-SIM"],
  ["dualsim", "Dual SIM"],
  ["dual sim", "Dual SIM"],
]);

/** @type {Map<string, object[]>} */
const simValueCache = new Map();

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeSimLookupKey(value) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return null;
  return text.replace(/\s+/g, "").replace(/＆/g, "&");
}

/**
 * Canonical catalog label for SIM/eSIM values.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeSimLabel(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;

  const compact = normalizeSimLookupKey(text);
  if (!compact) return null;

  if (SIM_ALIASES.has(compact)) return SIM_ALIASES.get(compact);
  if (SIM_ALIASES.has(text.toLowerCase())) return SIM_ALIASES.get(text.toLowerCase());

  // Preserve common casing for eSIM / SIM tokens.
  return text
    .replace(/\besim\b/gi, "eSIM")
    .replace(/\bsim\b/gi, "SIM");
}

/**
 * @param {unknown} attributes
 * @returns {string | null}
 */
function extractSimFromAttributes(attributes) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const record = /** @type {Record<string, unknown>} */ (attributes);
  const raw = record.sim ?? record.esim ?? record.eSIM;
  if (raw == null) return null;
  if (typeof raw === "string") return normalizeSimLabel(raw);
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string") return normalizeSimLabel(first);
    if (first && typeof first === "object" && "value" in first) {
      return normalizeSimLabel(/** @type {{ value: unknown }} */ (first).value);
    }
  }
  return null;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function ensureSimAttribute(prisma) {
  let attr = await prisma.attribute.findUnique({ where: { key: "sim" } });
  if (attr) return attr;
  return prisma.attribute.create({
    data: {
      key: "sim",
      type: "select",
      filterable: true,
      position: 2,
      translations: {
        create: LOCALES.map((locale) => ({
          locale,
          name: SIM_ATTRIBUTE_NAMES[locale] || SIM_ATTRIBUTE_NAMES.en,
        })),
      },
    },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 */
async function loadSimValues(prisma, attributeId) {
  const cached = simValueCache.get(attributeId);
  if (cached) return cached;
  const values = await prisma.attributeValue.findMany({
    where: { attributeId },
    include: { translations: true },
  });
  simValueCache.set(attributeId, values);
  return values;
}

/**
 * @param {object[]} values
 * @param {string} simLabel
 */
function findCachedSimValue(values, simLabel) {
  const target = normalizeSimLookupKey(normalizeSimLabel(simLabel));
  if (!target) return null;
  const matches = values.filter((av) => {
    const candidates = [av.value, ...av.translations.map((t) => t.label)];
    return candidates.some((label) => normalizeSimLookupKey(normalizeSimLabel(label)) === target);
  });
  if (matches.length === 0) return null;
  const exact = matches.find(
    (item) => normalizeSimLookupKey(normalizeSimLabel(item.value)) === target,
  );
  return exact || matches[0];
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} attributeId
 * @param {string} simLabel
 * @param {{ apply: boolean }} opts
 */
async function ensureCatalogSimValue(prisma, attributeId, simLabel, opts) {
  const canonical = normalizeSimLabel(simLabel);
  if (!canonical) {
    return { action: "skip", attributeValueId: null, value: null };
  }

  const values = await loadSimValues(prisma, attributeId);
  const match = findCachedSimValue(values, canonical);
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

function listVariantSimOptions(existing) {
  return existing;
}

async function updateSimOptionIfNeeded(prisma, opt, args) {
  const needsUpdate =
    opt.valueId !== args.attributeValueId ||
    opt.value !== args.canonicalName ||
    opt.attributeKey !== "sim" ||
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
      attributeKey: "sim",
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
async function ensureVariantSimOption(prisma, args) {
  const existing = await prisma.productVariantOption.findMany({
    where: {
      variantId: args.variantId,
      OR: [
        { attributeKey: "sim" },
        { attributeKey: "esim" },
        { attributeKey: "eSIM" },
        { attributeKey: "e_sim" },
        { attributeId: args.attributeId },
        { valueId: args.attributeValueId },
        { attributeValue: { attributeId: args.attributeId } },
      ],
    },
  });
  const simOptions = listVariantSimOptions(existing);
  if (simOptions.length > 1) {
    return {
      action: "manual_review",
      reason: "multiple_sim_options_on_variant",
      optionIds: simOptions.map((option) => option.id),
    };
  }
  if (simOptions.length === 1) {
    return updateSimOptionIfNeeded(prisma, simOptions[0], args);
  }
  if (!args.apply) {
    return { action: "create", optionId: null };
  }
  const created = await prisma.productVariantOption.create({
    data: {
      variantId: args.variantId,
      attributeId: args.attributeId,
      attributeKey: "sim",
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
async function ensureProductSimAttribute(prisma, productId, attributeId, apply) {
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

function mergeAttributesSim(attributes, canonicalName) {
  const base =
    attributes && typeof attributes === "object" && !Array.isArray(attributes)
      ? { ...attributes }
      : {};
  base.sim = canonicalName;
  if ("esim" in base) delete base.esim;
  if ("eSIM" in base) delete base.eSIM;
  return base;
}

module.exports = {
  LOCALES,
  normalizeSimLabel,
  extractSimFromAttributes,
  ensureSimAttribute,
  ensureCatalogSimValue,
  ensureVariantSimOption,
  ensureProductSimAttribute,
  mergeAttributesSim,
};
