#!/usr/bin/env node
/**
 * Per-route performance budget gate for the Mobee storefront.
 *
 * Measures, against a running server:
 *   - TTFB (time to first byte of the HTML document)
 *   - First-load client JS (gzip-equivalent transfer of all <script>/modulepreload
 *     chunks referenced by the initial HTML)
 *
 * First-load JS is the hard gate. TTFB is reported and only gated when
 * PERF_BUDGET_STRICT=1 (environment/DB dependent).
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/check-perf-budget.mjs
 *   PERF_BUDGET_STRICT=1 BASE_URL=https://mobee.am node scripts/check-perf-budget.mjs
 */
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const STRICT = process.env.PERF_BUDGET_STRICT === "1";
const TTFB_BUDGET_MS = Number(process.env.PERF_TTFB_BUDGET_MS ?? 1500);
const KB = 1024;

const PDP_SLUG = process.env.PERF_PDP_SLUG ?? "hisense-wf1i6022bwu-6";
const PLP_CATEGORY = process.env.PERF_PLP_CATEGORY ?? "";

const ROUTES = [
  { path: "/", label: "home", jsBudgetKb: 450 },
  { path: "/shop", label: "shop-plp", jsBudgetKb: 450 },
  ...(PLP_CATEGORY
    ? [{ path: `/shop?category=${PLP_CATEGORY}`, label: "shop-cat", jsBudgetKb: 450 }]
    : []),
  { path: `/products/${PDP_SLUG}`, label: "pdp", jsBudgetKb: 520 },
];

const CHUNK_SRC_RE = /(?:src|href)="(\/_next\/static\/[^"]+?\.js)"/g;

function extractChunkUrls(html) {
  const urls = new Set();
  let match;
  while ((match = CHUNK_SRC_RE.exec(html)) !== null) {
    urls.add(match[1]);
  }
  return [...urls];
}

async function fetchHtml(path) {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "text/html", "Accept-Encoding": "gzip, br" },
  });
  const ttfbMs = performance.now() - start;
  if (!res.ok) {
    throw new Error(`GET ${path} → HTTP ${res.status}`);
  }
  const html = await res.text();
  return { html, ttfbMs };
}

async function measureChunkGzip(chunkPath) {
  const res = await fetch(`${BASE_URL}${chunkPath}`);
  if (!res.ok) {
    throw new Error(`GET ${chunkPath} → HTTP ${res.status}`);
  }
  const raw = Buffer.from(await res.arrayBuffer());
  return gzipSync(raw).byteLength;
}

async function measureRoute(route) {
  const { html, ttfbMs } = await fetchHtml(route.path);
  const chunks = extractChunkUrls(html);
  const sizes = await Promise.all(chunks.map(measureChunkGzip));
  const jsBytes = sizes.reduce((sum, size) => sum + size, 0);
  return {
    ...route,
    ttfbMs,
    chunkCount: chunks.length,
    jsKb: jsBytes / KB,
  };
}

function formatRow(result) {
  const jsOver = result.jsKb > result.jsBudgetKb;
  const ttfbOver = result.ttfbMs > TTFB_BUDGET_MS;
  const jsMark = jsOver ? "FAIL" : "OK  ";
  const ttfbMark = ttfbOver ? (STRICT ? "FAIL" : "WARN") : "OK  ";
  return [
    `${jsMark} ${result.label.padEnd(10)}`,
    `JS ${result.jsKb.toFixed(1).padStart(6)} / ${result.jsBudgetKb} KB gz (${result.chunkCount} chunks)`,
    `| ${ttfbMark} TTFB ${result.ttfbMs.toFixed(0).padStart(5)} / ${TTFB_BUDGET_MS} ms`,
  ].join("  ");
}

async function main() {
  console.log(`\n=== Storefront perf budget (${BASE_URL}) ===\n`);
  const results = [];
  for (const route of ROUTES) {
    try {
      results.push(await measureRoute(route));
    } catch (error) {
      console.log(`FAIL ${route.label.padEnd(10)}  ${String(error.message ?? error)}`);
      results.push({ ...route, failed: true });
    }
  }

  let violated = false;
  for (const result of results) {
    if (result.failed) {
      violated = true;
      continue;
    }
    console.log(formatRow(result));
    if (result.jsKb > result.jsBudgetKb) {
      violated = true;
    }
    if (STRICT && result.ttfbMs > TTFB_BUDGET_MS) {
      violated = true;
    }
  }

  console.log("");
  if (violated) {
    console.log("Perf budget exceeded. Tune budgets only with team alignment.\n");
    process.exit(1);
  }
  console.log("All routes within budget.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
