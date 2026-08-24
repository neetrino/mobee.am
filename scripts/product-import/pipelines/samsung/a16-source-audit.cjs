#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { fetchHtml } = require("../apple/http.cjs");
const { searchTargetModel, buildReadyProduct } = require("./yerevanmobile-missing-check.cjs");
const { loadExistingCatalog, checkProductExists } = require("./check-existing-db.cjs");
const {
  normalizeManualCandidateUrl,
  buildMobileCentreFetchUrls,
} = require("./mobilecentre-url.cjs");
const { fetchAndParseMobileCentreProduct } = require("./mobilecentre-samsung-parse.cjs");

const ROOT = path.join(__dirname, "../../../..");
const OUT_DIR = path.join(ROOT, "audit/product-import/samsung/a16-import");
const TARGET_MODEL = "Samsung Galaxy A16";
const MC_A16_FALLBACK_URL =
  "https://www.mobilecentre.am/product/samsung-galaxy-a16-128gb-_black_/31203/";

const YM_SLUGS = [
  "https://www.yerevanmobile.am/en/samsung-galaxy-a16.html",
  "https://www.yerevanmobile.am/am/samsung-galaxy-a16.html",
  "https://www.yerevanmobile.am/ru/samsung-galaxy-a16.html",
];

const MC_SEARCH = "https://www.mobilecentre.am/search/?searchData=Samsung%20Galaxy%20A16";

function summarizeOptions(variants) {
  const values = {};
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options || {})) {
      if (!value) continue;
      if (!values[key]) values[key] = new Set();
      values[key].add(String(value));
    }
  }
  return Object.fromEntries(Object.entries(values).map(([key, set]) => [key, [...set].sort()]));
}

function buildReadyProductFromMobileCentre(mcResult, catalog) {
  const variant = mcResult.variant;
  const parentPayload = {
    source: "mobilecentre",
    model: TARGET_MODEL,
    product_name: TARGET_MODEL,
    product_title: variant.name,
    source_urls: [mcResult.canonicalUrl],
    source_language: "hy",
    variants: [{ ...variant, db_status: "new", db_match: null }],
    variant_count: 1,
    price_min: variant.price,
    price_max: variant.price,
    available_options: summarizeOptions([variant]),
    description: variant.description || "",
    specifications: variant.description || "",
  };

  const parentDup = checkProductExists(catalog, parentPayload);
  if (parentDup.exists) {
    return {
      bucket: "already_exists_or_duplicate",
      row: {
        product: TARGET_MODEL,
        product_title: variant.name,
        existing_db_product: parentDup.product?.title,
        db_id: parentDup.product?.id,
        reason: parentDup.reason,
        source_url: mcResult.canonicalUrl,
      },
    };
  }

  return {
    bucket: "ready_to_import",
    product: {
      ...parentPayload,
      ready_to_import: true,
    },
  };
}

async function auditMobileCentreSearch() {
  const notes = [MC_SEARCH];
  const { text, status } = await fetchHtml(MC_SEARCH, { sleepMs: 150 });
  if (status >= 400) {
    return { source: "mobilecentre", status: "source_blocked", notes, reason: `http_${status}` };
  }

  const productLinks = [...text.matchAll(/href=["']([^"']*(?:m=prod|\/product\/)[^"']*)["']/gi)].map((m) => m[1]);
  const candidateUrls = [];

  for (const href of productLinks) {
    const rawUrl = href.startsWith("http") ? href : `https://www.mobilecentre.am${href}`;
    const normalized = normalizeManualCandidateUrl(rawUrl);
    if (!normalized.ok) {
      notes.push(`rejected_url:${rawUrl}:${normalized.error}`);
      continue;
    }
    candidateUrls.push(normalized.canonicalUrl);
  }

  const uniqueCandidates = [...new Set(candidateUrls)];
  if (!uniqueCandidates.length) {
    return {
      source: "mobilecentre",
      status: "not_found",
      notes,
      reason: "empty_search_results",
      details: "MobileCentre search returned no valid product links for Samsung Galaxy A16",
    };
  }

  for (const canonicalUrl of uniqueCandidates) {
    const parsed = await fetchAndParseMobileCentreProduct(canonicalUrl, TARGET_MODEL, { validateA16: true });
    notes.push(...(parsed.notes || []));
    if (parsed.status === "ready") {
      return {
        source: "mobilecentre",
        status: "ready",
        url: parsed.canonicalUrl,
        title: parsed.title,
        notes,
        variant: parsed.variant,
      };
    }
    if (parsed.status === "content_mismatch") {
      return {
        source: "mobilecentre",
        status: "content_mismatch",
        url: parsed.canonicalUrl,
        title: parsed.title,
        reason: parsed.reason,
        notes,
      };
    }
    if (/a16\s*5g/i.test(parsed.title || "")) {
      return { source: "mobilecentre", status: "wrong_match_5g", url: parsed.canonicalUrl, title: parsed.title, notes };
    }
  }

  return { source: "mobilecentre", status: "not_found", notes, reason: "no_exact_a16_product_page" };
}

async function auditMobileCentreFallback() {
  const normalized = normalizeManualCandidateUrl(MC_A16_FALLBACK_URL);
  const notes = [MC_A16_FALLBACK_URL, normalized.ok ? normalized.canonicalUrl : normalized.error];

  if (!normalized.ok) {
    return {
      source: "mobilecentre",
      status: "invalid_url",
      reason: normalized.error,
      notes,
      fallback: true,
    };
  }

  const parsed = await fetchAndParseMobileCentreProduct(normalized.canonicalUrl, TARGET_MODEL, {
    validateA16: true,
  });
  notes.push(...(parsed.notes || []));

  if (parsed.status === "ready") {
    return {
      source: "mobilecentre",
      status: "ready",
      url: parsed.canonicalUrl,
      title: parsed.title,
      notes,
      variant: parsed.variant,
      fallback: true,
    };
  }

  return {
    source: "mobilecentre",
    status: parsed.status === "content_mismatch" ? "content_mismatch" : "not_found",
    url: parsed.canonicalUrl,
    title: parsed.title,
    reason: parsed.reason || "fallback_product_unavailable",
    notes,
    fallback: true,
    fetch_urls_tried: buildMobileCentreFetchUrls(normalized.canonicalUrl),
  };
}

async function auditMobileCentre() {
  const searchResult = await auditMobileCentreSearch();
  if (searchResult.status === "ready") return searchResult;
  const fallbackResult = await auditMobileCentreFallback();
  if (fallbackResult.status === "ready") return fallbackResult;
  return {
    ...fallbackResult,
    search_status: searchResult.status,
    search_reason: searchResult.reason,
  };
}

function writeReport(payload) {
  const lines = [
    "# Samsung Galaxy A16 Source Audit",
    "",
    `> Generated: ${payload.generated_at}`,
    "> Mode: read-only audit — no DB import",
    "",
    "## Why A16 Was Previously Excluded",
    "",
    "- `Samsung Galaxy A16` was in **hard-reject** patterns across Samsung whitelist modules.",
    "- It was **not** in the approved whitelist / YerevanMobile scope used for 2025/2026-only imports.",
    "- Current business rule now allows **Samsung Galaxy A16** as a separate non-5G parent model.",
    "",
    "## Audit Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Target model | ${TARGET_MODEL} |`,
    `| Ready to import | ${payload.summary.ready_to_import_parent_products} |`,
    `| Duplicate in DB | ${payload.summary.already_exists_or_duplicate} |`,
    `| Blocked / not found | ${payload.summary.not_found} |`,
    `| YerevanMobile result | ${payload.source_audit.yerevanmobile.status} |`,
    `| MobileCentre result | ${payload.source_audit.mobilecentre.status} |`,
    "",
    "## Source Checks",
    "",
    "| Source | Status | Details |",
    "| --- | --- | --- |",
    `| YerevanMobile | ${payload.source_audit.yerevanmobile.status} | ${payload.source_audit.yerevanmobile.details || payload.source_audit.yerevanmobile.reason || "—"} |`,
    `| MobileCentre | ${payload.source_audit.mobilecentre.status} | ${payload.source_audit.mobilecentre.details || payload.source_audit.mobilecentre.reason || payload.source_audit.mobilecentre.url || "—"} |`,
    "",
    "## MobileCentre Fallback URL",
    "",
    `- Canonical: \`${MC_A16_FALLBACK_URL}\``,
    `- Saved without backslashes; escaped \\_ inputs are normalized before fetch.`,
    "",
    "## Ready To Import",
    "",
  ];

  if (!payload.ready_to_import.length) {
    lines.push("_None — import blocked._", "");
  } else {
    lines.push("| Model | Title | Variants | Price (AMD) | Source URL |", "| --- | --- | ---: | ---: | --- |");
    for (const row of payload.ready_to_import) {
      lines.push(`| ${row.model} | ${row.product_title} | ${row.variant_count} | ${row.price_min} | ${row.source_urls[0]} |`);
    }
    lines.push("");
  }

  lines.push("## Duplicate / Blocked", "");
  if (payload.already_exists_or_duplicate.length) {
    for (const row of payload.already_exists_or_duplicate) {
      lines.push(`- **${row.product}** — ${row.reason}`);
    }
  } else if (payload.not_found.length) {
    lines.push(`- **${TARGET_MODEL}** — ${payload.not_found[0]?.notes || "not_found"}`);
  } else {
    lines.push("- None");
  }

  lines.push("", "## Commands Used", "");
  for (const cmd of payload.commands) {
    lines.push(`- \`${cmd.command}\` → exit ${cmd.exit_code}`);
  }

  lines.push("", "## Recommendation", "", payload.recommendation, "");
  fs.writeFileSync(path.join(OUT_DIR, "samsung-a16-audit-report.md"), lines.join("\n"), "utf8");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const catalog = await loadExistingCatalog();
  const commands = [{ command: "node scripts/product-import/pipelines/samsung/a16-source-audit.cjs", exit_code: 0 }];

  const duplicate = checkProductExists(catalog, { model: TARGET_MODEL, product_name: TARGET_MODEL });
  const ymAudit = { source: "yerevanmobile", checked_slugs: YM_SLUGS };
  const ymResult = await searchTargetModel(TARGET_MODEL);
  const mcResult = await auditMobileCentre();

  let readyToImport = [];
  let alreadyExists = [];
  let notFound = [];
  const rejected = ymResult.rejected || [];

  if (duplicate.exists) {
    alreadyExists.push({
      product: TARGET_MODEL,
      existing_db_product: duplicate.product?.title,
      db_id: duplicate.product?.id,
      reason: duplicate.reason,
    });
  } else if (ymResult.target_model && ymResult.variants?.length) {
    const built = buildReadyProduct(ymResult, catalog);
    if (built.bucket === "ready_to_import") readyToImport.push(built.product);
    else if (built.bucket === "already_exists_or_duplicate") alreadyExists.push(built.row);
  } else if (mcResult.status === "ready" && mcResult.variant) {
    const built = buildReadyProductFromMobileCentre(mcResult, catalog);
    if (built.bucket === "ready_to_import") readyToImport.push(built.product);
    else if (built.bucket === "already_exists_or_duplicate") alreadyExists.push(built.row);
  } else if (ymResult.found_but_not_imported) {
    notFound.push({
      target_model: TARGET_MODEL,
      reason: ymResult.found_but_not_imported.reason,
      notes: ymResult.found_but_not_imported.reason,
    });
  } else {
    notFound.push({
      target_model: TARGET_MODEL,
      reason: mcResult.status === "ready" ? "blocked_after_build" : "not_found_on_both_sources",
      notes: `YM: ${ymResult.not_found ? "not_found" : ymResult.found_but_not_imported?.reason || "no_hit"}; MC: ${mcResult.reason || mcResult.status}`,
      checked_paths: ymResult.checked_paths,
      mobilecentre_url: mcResult.url || MC_A16_FALLBACK_URL,
    });
  }

  ymAudit.status = readyToImport.length
    ? "ready"
    : ymResult.not_found
      ? "not_found"
      : ymResult.found_but_not_imported?.reason || "blocked";
  ymAudit.details = readyToImport[0]?.source_urls?.[0] || ymResult.found_but_not_imported?.reason || "No exact A16 product page";

  mcResult.details =
    mcResult.status === "ready"
      ? `${mcResult.title} @ ${mcResult.url}`
      : mcResult.reason || mcResult.search_reason || "No valid MobileCentre A16 listing";

  const payload = {
    generated_at: new Date().toISOString(),
    target_model: TARGET_MODEL,
    audit_findings: {
      previous_blockers: ["hard_reject_pattern_a16", "missing_from_whitelist", "not_in_yerevanmobile_scope"],
      current_rule: "Samsung Galaxy A16 allowed as non-5G parent; A16 5G remains separate/hard-rejected",
      mobilecentre_fallback_url: MC_A16_FALLBACK_URL,
    },
    summary: {
      ready_to_import_parent_products: readyToImport.length,
      ready_to_import_variants: readyToImport.reduce((s, p) => s + p.variant_count, 0),
      already_exists_or_duplicate: alreadyExists.length,
      not_found: notFound.length ? 1 : 0,
      rejected: rejected.length,
    },
    source_audit: {
      yerevanmobile: ymAudit,
      mobilecentre: mcResult,
    },
    ready_to_import: readyToImport,
    already_exists_or_duplicate: alreadyExists,
    not_found: notFound,
    rejected,
    commands,
    recommendation:
      readyToImport.length === 1
        ? "Dry-run shows exactly 1 ready A16 product. Safe to run `node scripts/product-import/pipelines/samsung/import-a16.cjs --import` after review."
        : duplicate.exists
          ? "Skip import — Samsung Galaxy A16 already exists in DB."
          : "Do **not** import — no valid YerevanMobile/MobileCentre listing found for exact Samsung Galaxy A16 128GB Black.",
  };

  fs.writeFileSync(path.join(OUT_DIR, "samsung-a16.dry-run.json"), JSON.stringify(payload, null, 2), "utf8");
  writeReport(payload);
  console.log(JSON.stringify({ summary: payload.summary, recommendation: payload.recommendation }, null, 2));
}

main().catch((error) => {
  console.error("FATAL:", error.message);
  process.exit(1);
});

module.exports = {
  MC_A16_FALLBACK_URL,
  normalizeManualCandidateUrl,
  buildReadyProductFromMobileCentre,
};
