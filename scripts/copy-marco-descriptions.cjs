/**
 * Copy Marco descriptions onto Mobee products (descriptionHtml only).
 *
 * Scope: Mobee products with variant source='marco' + sourcePid.
 * Policy: overwrite existing descriptionHtml (identical HTML is skipped).
 * Never writes titles, slugs, prices, images, or variants.
 *
 * Usage:
 *   node scripts/copy-marco-descriptions.cjs
 *   node scripts/copy-marco-descriptions.cjs --limit=10
 *   node scripts/copy-marco-descriptions.cjs --product-id=<id>
 *   node scripts/copy-marco-descriptions.cjs --apply
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const {
  pickTitle,
  resolveMarcoId,
  planProduct,
  applyLimit,
  summarizePlans,
  serializePlan,
  applyUpdates,
} = require("./lib/marco/copy-descriptions-lib.cjs");
const {
  loadMobeeMarcoProducts,
  resolveMarcoProductIdsFromVariants,
  loadMarcoTranslations,
} = require("./lib/marco/copy-descriptions-queries.cjs");

const REPORT_PATH = path.join(
  process.cwd(),
  "scripts",
  "copy-marco-descriptions.dry-run.json"
);

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv) {
  const args = { apply: false, limit: null, productId: null, help: false };
  for (const raw of argv) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (raw.startsWith("--limit=")) {
      const n = Number(raw.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 1) throw new Error("Invalid --limit");
      args.limit = Math.floor(n);
    } else if (raw.startsWith("--product-id=")) {
      args.productId = raw.slice("--product-id=".length).trim();
      if (!args.productId) throw new Error("Invalid --product-id");
    } else {
      throw new Error(`Unknown argument: ${raw}`);
    }
  }
  return args;
}

function createClient(connectionString) {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 300000,
  });
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgresql:/i, "http:")).host;
  } catch {
    return "unknown-host";
  }
}

function matchPlans(products, variantToProduct) {
  const plans = [];
  for (const product of products) {
    const sourcePids = (product.source_pids || []).map(String);
    const marcoIds = resolveMarcoId(sourcePids, variantToProduct);
    const base = {
      productId: product.id,
      published: product.published,
      title: pickTitle(product.translations),
      sourcePids,
      updates: [],
    };
    if (marcoIds.length === 0) {
      plans.push({ ...base, reason: "NO_MARCO_MATCH", marcoProductId: null });
      continue;
    }
    if (marcoIds.length > 1) {
      plans.push({
        ...base,
        reason: "AMBIGUOUS_MATCH",
        marcoProductId: marcoIds.join(","),
      });
      continue;
    }
    plans.push({ ...base, marcoProductId: marcoIds[0], reason: "PENDING" });
  }
  return plans;
}

function fillDescriptionPlans(plans, productsById, marcoById) {
  for (const plan of plans) {
    if (plan.reason !== "PENDING") continue;
    const marcoRow = marcoById.get(plan.marcoProductId);
    if (!marcoRow) {
      plan.reason = "NO_MARCO_MATCH";
      continue;
    }
    const next = planProduct(productsById.get(plan.productId), marcoRow);
    plan.reason = next.reason;
    plan.updates = next.updates;
  }
}

function printReport(report) {
  const c = report.counts;
  console.log(`Mode: ${report.mode}`);
  console.log(`Marco-sourced Mobee products: ${c.marcoSourcedProducts}`);
  console.log(`UPDATE products: ${c.UPDATE || 0}`);
  console.log(`Already identical: ${c.ALREADY_IDENTICAL || 0}`);
  console.log(`No Marco match: ${c.NO_MARCO_MATCH || 0}`);
  console.log(`Ambiguous match: ${c.AMBIGUOUS_MATCH || 0}`);
  console.log(`No Marco description: ${c.NO_MARCO_DESCRIPTION || 0}`);
  console.log(`Translations to update: ${c.translationsToUpdate}`);
  if (report.mode === "APPLY") {
    console.log(`Applied translations: ${c.appliedTranslations}`);
    console.log("Next: pnpm rebuild:pdp-read-model");
  } else {
    console.log("Dry-run only. Re-run with --apply to write.");
  }
  console.log(`Report: ${REPORT_PATH}`);
}

async function run(args, marco, mobee, env) {
  const products = await loadMobeeMarcoProducts(mobee, args.productId);
  const productsById = new Map(products.map((p) => [p.id, p]));
  const allSourcePids = products.flatMap((p) =>
    (p.source_pids || []).map(String)
  );
  const variantToProduct = await resolveMarcoProductIdsFromVariants(
    marco,
    [...new Set(allSourcePids)]
  );
  const plans = matchPlans(products, variantToProduct);
  const matchedIds = [
    ...new Set(
      plans
        .filter((p) => p.reason === "PENDING")
        .map((p) => p.marcoProductId)
    ),
  ];
  const marcoById = await loadMarcoTranslations(marco, matchedIds);
  fillDescriptionPlans(plans, productsById, marcoById);
  const writable = applyLimit(plans, args.limit);
  const counts = summarizePlans(plans, writable);
  counts.marcoSourcedProducts = products.length;
  counts.appliedTranslations = 0;

  const report = {
    mode: args.apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    marcoHost: hostOf(env.MARCO_DIRECT_URL),
    mobeeHost: hostOf(env.DIRECT_URL),
    args,
    counts,
    sample: plans.filter((p) => p.reason === "UPDATE").slice(0, 15).map(serializePlan),
    products: plans.map(serializePlan),
  };

  if (args.apply) {
    report.counts.appliedTranslations = await applyUpdates(mobee, writable);
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  printReport(report);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/copy-marco-descriptions.cjs [--limit=<n>] [--product-id=<id>] [--apply]

Default: dry-run (report only). --apply overwrites descriptionHtml on Marco-sourced Mobee products.`);
    return;
  }

  const env = loadEnv(path.join(process.cwd(), ".env"));
  if (!env.MARCO_DIRECT_URL) throw new Error("Missing MARCO_DIRECT_URL");
  if (!env.DIRECT_URL) throw new Error("Missing DIRECT_URL");

  const marco = createClient(env.MARCO_DIRECT_URL);
  const mobee = createClient(env.DIRECT_URL);
  await marco.connect();
  await mobee.connect();
  try {
    await run(args, marco, mobee, env);
  } finally {
    await marco.end();
    await mobee.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
