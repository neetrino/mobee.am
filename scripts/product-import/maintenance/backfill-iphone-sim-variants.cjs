#!/usr/bin/env node
"use strict";

/** Backfill iPhone SIM variants: Dual eSIM (2 eSIM) + Nano-SIM & eSIM (SIM + eSIM). */

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "../../..");
const LOCALES = ["en", "hy", "ru"];
const SIM_DUAL = "Dual eSIM";
const SIM_NANO = "Nano-SIM & eSIM";
const SIM_LABELS = {
  [SIM_DUAL]: { en: "2 eSIM", hy: "2 eSIM", ru: "2 eSIM" },
  [SIM_NANO]: { en: "SIM + eSIM", hy: "SIM + eSIM", ru: "SIM + eSIM" },
};
const SKIP_NANO_SIM_MODELS = new Set(["iphone air"]);

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function optionByKey(variant, key) {
  return variant.options.find((o) => o.attributeKey === key) || null;
}

function classifySim(variant) {
  const candidates = [
    optionByKey(variant, "sim")?.value,
    optionByKey(variant, "connectivity")?.value,
  ].filter(Boolean);
  for (const raw of candidates) {
    const val = String(raw).toLowerCase();
    if (val.includes("nano") || val.includes("sim +") || val.includes("sim+")) return "nano";
    if (val.includes("dual") || val.replace(/\s+/g, "") === "2esim") return "dual";
  }
  return null;
}

function comboKey(variant) {
  const color = optionByKey(variant, "color")?.value || "";
  const storage = optionByKey(variant, "storage")?.value || "";
  return `${color}|${storage}`;
}

function simValueName(kind) {
  return kind === "dual" ? SIM_DUAL : SIM_NANO;
}

function uniqueSku(usedSkus, base) {
  let sku = base;
  let n = 2;
  while (usedSkus.has(sku)) sku = `${base}-${n++}`;
  usedSkus.add(sku);
  return sku;
}

async function findOrCreateSimValue(prisma, simAttr, valueCache, value) {
  const norm = value.toLowerCase();
  if (valueCache[norm]) return valueCache[norm];
  const posCount = await prisma.attributeValue.count({ where: { attributeId: simAttr.id } });
  const labels = SIM_LABELS[value] || { en: value, hy: value, ru: value };
  const created = await prisma.attributeValue.create({
    data: {
      attributeId: simAttr.id,
      value,
      position: posCount,
      translations: { create: LOCALES.map((locale) => ({ locale, label: labels[locale] || value })) },
    },
  });
  valueCache[norm] = created;
  return created;
}

function nextAttributes(variant, simName) {
  const current = variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
    ? { ...variant.attributes }
    : {};
  const connectivity = current.connectivity;
  const connVal = Array.isArray(connectivity) ? connectivity[0] : connectivity;
  if (connVal === SIM_DUAL || connVal === SIM_NANO) delete current.connectivity;
  current.sim = [simName];
  return current;
}

async function setVariantSim(tx, variant, simAttr, simValue, apply) {
  const simName = simValue.value;
  if (!apply) return { action: "set-sim", sku: variant.sku, sim: simName };
  await tx.productVariantOption.deleteMany({
    where: {
      variantId: variant.id,
      OR: [
        { attributeKey: "sim" },
        { attributeKey: "connectivity", value: { in: [SIM_DUAL, SIM_NANO] } },
      ],
    },
  });
  await tx.productVariantOption.create({
    data: {
      variantId: variant.id,
      attributeId: simAttr.id,
      attributeKey: "sim",
      valueId: simValue.id,
      value: simValue.value,
    },
  });
  await tx.productVariant.update({
    where: { id: variant.id },
    data: { attributes: nextAttributes(variant, simName) },
  });
  return { action: "set-sim", sku: variant.sku, sim: simName };
}

async function cloneVariant(tx, product, source, simAttr, simValue, usedSkus, apply) {
  const suffix = simValue.value === SIM_NANO ? "sim-esim" : "dual-esim";
  const sku = uniqueSku(usedSkus, `${source.sku}-${suffix}`);
  if (!apply) return { action: "clone", from: source.sku, sku, sim: simValue.value };
  const created = await tx.productVariant.create({
    data: {
      productId: product.id,
      sku,
      barcode: source.barcode,
      price: source.price,
      priceOnRequest: source.priceOnRequest,
      compareAtPrice: source.compareAtPrice,
      cost: source.cost,
      stock: source.stock,
      weightGrams: source.weightGrams,
      imageUrl: source.imageUrl,
      media: source.media,
      position: source.position + 50,
      published: source.published,
      source: source.source,
      sourcePid: source.sourcePid ? `${source.sourcePid}-${suffix}` : null,
      sourceUrl: source.sourceUrl,
      attributes: nextAttributes(source, simValue.value),
    },
  });
  const keepKeys = new Set(["color", "storage"]);
  for (const opt of source.options) {
    if (!keepKeys.has(opt.attributeKey) || !opt.value) continue;
    await tx.productVariantOption.create({
      data: {
        variantId: created.id,
        attributeId: opt.attributeId,
        attributeKey: opt.attributeKey,
        valueId: opt.valueId,
        value: opt.value,
      },
    });
  }
  await tx.productVariantOption.create({
    data: {
      variantId: created.id,
      attributeId: simAttr.id,
      attributeKey: "sim",
      valueId: simValue.id,
      value: simValue.value,
    },
  });
  return { action: "clone", from: source.sku, sku, sim: simValue.value, id: created.id };
}

function planCombo(rows) {
  const dual = rows.filter((r) => r.kind === "dual");
  const nano = rows.filter((r) => r.kind === "nano");
  const none = rows.filter((r) => r.kind === null);
  const ops = [];
  if (dual.length && none.length) {
    ops.push({ type: "set", variant: none[0].variant, kind: "nano" });
    none.slice(1).forEach((row) => ops.push({ type: "set", variant: row.variant, kind: "nano" }));
  } else if (nano.length && none.length) {
    ops.push({ type: "set", variant: none[0].variant, kind: "dual" });
    none.slice(1).forEach((row) => ops.push({ type: "set", variant: row.variant, kind: "dual" }));
  } else if (!dual.length && !nano.length && none.length) {
    ops.push({ type: "set", variant: none[0].variant, kind: "dual" });
    if (none.length > 1) ops.push({ type: "set", variant: none[1].variant, kind: "nano" });
    else ops.push({ type: "clone", variant: none[0].variant, kind: "nano" });
    none.slice(2).forEach((row) => ops.push({ type: "set", variant: row.variant, kind: "nano" }));
  }
  if (dual.length && !nano.length && !none.length) {
    ops.push({ type: "clone", variant: dual[0].variant, kind: "nano" });
  }
  if (nano.length && !dual.length && !none.length) {
    ops.push({ type: "clone", variant: nano[0].variant, kind: "dual" });
  }
  for (const row of [...dual, ...nano]) {
    const onSim = optionByKey(row.variant, "sim")?.value === simValueName(row.kind);
    const onConn = optionByKey(row.variant, "connectivity");
    if (!onSim || onConn) ops.push({ type: "set", variant: row.variant, kind: row.kind });
  }
  return ops;
}

async function attachSimAttribute(tx, product, simAttr) {
  await tx.productAttribute.upsert({
    where: { productId_attributeId: { productId: product.id, attributeId: simAttr.id } },
    create: { productId: product.id, attributeId: simAttr.id },
    update: {},
  });
  const connectivityAttr = product.productAttributes.find((pa) => pa.attribute?.key === "connectivity");
  const leftoverConnectivity = await tx.productVariantOption.count({
    where: {
      variant: { productId: product.id },
      attributeKey: "connectivity",
      NOT: { value: { in: [SIM_DUAL, SIM_NANO] } },
    },
  });
  let nextIds = Array.from(new Set([...(product.attributeIds || []), simAttr.id]));
  if (!leftoverConnectivity && connectivityAttr) {
    await tx.productAttribute.deleteMany({
      where: { productId: product.id, attributeId: connectivityAttr.attributeId },
    });
    nextIds = nextIds.filter((id) => id !== connectivityAttr.attributeId);
  }
  await tx.product.update({ where: { id: product.id }, data: { attributeIds: nextIds } });
}

async function updateSimLabels(prisma, simValues, apply) {
  const changes = [];
  for (const value of simValues) {
    const labels = SIM_LABELS[value.value];
    if (!labels) continue;
    for (const locale of LOCALES) {
      const current = value.translations.find((t) => t.locale === locale);
      if (!current || current.label === labels[locale]) continue;
      changes.push({ value: value.value, locale, from: current.label, to: labels[locale] });
      if (apply) {
        await prisma.attributeValueTranslation.update({
          where: { id: current.id },
          data: { label: labels[locale] },
        });
      }
    }
  }
  return changes;
}

async function main() {
  loadEnv();
  const apply = process.argv.includes("--apply");
  const { PrismaClient } = require("../../../shared/db/generated/client");
  const prisma = new PrismaClient();

  try {
    const simAttr = await prisma.attribute.findUnique({
      where: { key: "sim" },
      include: { values: { include: { translations: true } } },
    });
    if (!simAttr) throw new Error("SIM attribute is missing");

    const valueCache = {};
    for (const v of simAttr.values) valueCache[v.value.toLowerCase()] = v;
    const dualValue = await findOrCreateSimValue(prisma, simAttr, valueCache, SIM_DUAL);
    const nanoValue = await findOrCreateSimValue(prisma, simAttr, valueCache, SIM_NANO);
    const byKind = { dual: dualValue, nano: nanoValue };

    const labelChanges = await updateSimLabels(prisma, [dualValue, nanoValue], apply);
    const iphones = await prisma.product.findMany({
      where: {
        deletedAt: null,
        translations: { some: { title: { contains: "iPhone", mode: "insensitive" } } },
      },
      include: {
        translations: true,
        productAttributes: { include: { attribute: true } },
        variants: { include: { options: true }, orderBy: { position: "asc" } },
      },
    });

    const usedSkus = new Set(
      (await prisma.productVariant.findMany({ select: { sku: true } }))
        .map((row) => row.sku)
        .filter(Boolean)
    );
    const report = { mode: apply ? "apply" : "dry-run", labelChanges, products: [] };

    for (const product of iphones) {
      const title = product.translations.find((t) => t.locale === "en")?.title || product.translations[0]?.title;
      const grouped = new Map();
      for (const variant of product.variants) {
        const key = comboKey(variant);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ variant, kind: classifySim(variant) });
      }
      const actions = [];
      const skipNano = SKIP_NANO_SIM_MODELS.has(String(title).toLowerCase());
      for (const [combo, rows] of grouped.entries()) {
        for (const op of planCombo(rows)) {
          if (skipNano && op.kind === "nano") continue;
          actions.push({ combo, ...op, sku: op.variant.sku });
        }
      }
      if (apply) {
        await prisma.$transaction(async (tx) => {
          for (const op of actions) {
            const simValue = byKind[op.kind];
            if (op.type === "clone") {
              await cloneVariant(tx, product, op.variant, simAttr, simValue, usedSkus, true);
            } else {
              await setVariantSim(tx, op.variant, simAttr, simValue, true);
            }
          }
          await attachSimAttribute(tx, product, simAttr);
        }, { timeout: 60000 });
      }
      report.products.push({
        title,
        variantCount: product.variants.length,
        actions: actions.map((a) => ({ type: a.type, sku: a.sku, combo: a.combo, sim: simValueName(a.kind) })),
      });
    }

    console.log(JSON.stringify(report, null, 2));
    if (!apply) console.log("\nDry-run only. Re-run with --apply to write changes.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
