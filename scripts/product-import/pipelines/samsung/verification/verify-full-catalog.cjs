#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadSamsungDbCatalog } = require("../full-catalog/db-catalog.cjs");
const { KEY_SLUGS, VERIFICATION_MD, ROOT } = require("../full-catalog/constants.cjs");

function isR2Url(url) {
  if (!url || typeof url !== "string") return false;
  const base = process.env.R2_PUBLIC_URL || "";
  if (base && url.startsWith(base)) return true;
  return /\.r2\.dev|r2\.cloudflarestorage\.com/i.test(url);
}

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

function hasVariantOptions(attributes) {
  if (!attributes || typeof attributes !== "object") return false;
  return Boolean(attributes.color || attributes.storage || attributes.ram);
}

function isSourceDomainImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /mobilecentre\.am|yerevanmobile\.am/i.test(url);
}

async function fetchProductApi(slug) {
  const base = process.env.VERIFY_API_BASE || "http://localhost:3000";
  const url = `${base}/api/v1/products/${slug}?lang=en`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { ok: false, status: response.status, slug };
    const data = await response.json();
    const product = data?.product || data;
    const variants = product?.variants || [];
    const optionsVisible = variants.some((variant) => Array.isArray(variant.options) && variant.options.length > 0);
    const singleSku = variants.length === 1;
    const optionsOk = optionsVisible || singleSku;
    const description = Boolean(
      (product?.description && product.description.length > 50) ||
        (product?.descriptionHtml && product.descriptionHtml.length > 50),
    );
    const r2Media = [product?.imageUrl, ...(product?.media || []), ...variants.flatMap((v) => [v.imageUrl, ...(v.media || [])])]
      .filter(Boolean)
      .every((item) => (typeof item === "string" ? isR2Url(item) : isR2Url(item?.url)));
    return {
      ok: true,
      slug,
      variants: variants.length,
      optionsVisible: optionsOk,
      description,
      r2Media,
      result: optionsOk && description && r2Media ? "pass" : "fail",
    };
  } catch (error) {
    return { ok: false, slug, error: error.message, result: "error" };
  }
}

async function runVerification() {
  loadEnv();
  const catalog = await loadSamsungDbCatalog();
  const issues = [];
  const slugSet = new Set();
  const variantKeySet = new Set();

  for (const product of catalog) {
    if (!product.published) issues.push({ type: "not_published", slug: product.slug });
    if (product.variants.length === 0) issues.push({ type: "no_variants", slug: product.slug });

    if (slugSet.has(product.slug)) issues.push({ type: "duplicate_product_slug", slug: product.slug });
    slugSet.add(product.slug);

    if (!product.descriptionHtml || product.descriptionHtml.length < 80) {
      issues.push({ type: "missing_description", slug: product.slug });
    }

    for (const variant of product.variants) {
      if (variant.priceOnRequest) {
        issues.push({ type: "price_on_request", slug: product.slug, sku: variant.sku });
      }
      if (!variant.sourceUrl) {
        issues.push({ type: "missing_source_url", slug: product.slug, sku: variant.sku });
      }
      if (variant.imageUrl && !isR2Url(variant.imageUrl)) {
        issues.push({ type: "non_r2_variant_image", slug: product.slug, sku: variant.sku, url: variant.imageUrl });
      }
      if (isSourceDomainImageUrl(variant.imageUrl)) {
        issues.push({ type: "source_domain_image", slug: product.slug, sku: variant.sku, url: variant.imageUrl });
      }

      const key = `${product.slug}|${variant.dedupe_key}|${variant.source}|${variant.sourcePid}`;
      if (variantKeySet.has(key)) issues.push({ type: "duplicate_variant", slug: product.slug, key });
      variantKeySet.add(key);
    }

    const configurable = product.variants.length > 1;
    if (configurable && !product.variants.some((variant) => hasVariantOptions(variant.attributes))) {
      issues.push({ type: "missing_variant_attributes", slug: product.slug });
    }
  }

  const apiChecks = [];
  for (const slug of KEY_SLUGS) {
    apiChecks.push(await fetchProductApi(slug));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      samsung_phone_products: catalog.length,
      total_variants: catalog.reduce((sum, product) => sum + product.variants.length, 0),
      issues: issues.length,
      api_checks_passed: apiChecks.filter((row) => row.result === "pass").length,
      api_checks_total: apiChecks.length,
    },
    issues,
    api_checks: apiChecks,
    pass: issues.length === 0 && apiChecks.every((row) => row.result === "pass"),
  };

  const lines = [
    "# Samsung Full Catalog Verification Report",
    "",
    "## Summary",
    "",
    `- Samsung phone products: ${payload.summary.samsung_phone_products}`,
    `- Total variants: ${payload.summary.total_variants}`,
    `- Issues: ${payload.summary.issues}`,
    `- API checks passed: ${payload.summary.api_checks_passed}/${payload.summary.api_checks_total}`,
    `- Overall: ${payload.pass ? "PASS" : "FAIL"}`,
    "",
    "## API/PDP verification",
    "",
    "| Slug | Variants | Options visible | Description | R2 media | Result |",
    "| --- | ---: | --- | --- | --- | --- |",
  ];

  for (const row of apiChecks) {
    lines.push(
      `| ${row.slug} | ${row.variants ?? "—"} | ${row.optionsVisible ? "yes" : "no"} | ${row.description ? "yes" : "no"} | ${row.r2Media ? "yes" : "no"} | ${row.result || "error"} |`,
    );
  }

  if (issues.length) {
    lines.push("", "## Issues", "");
    for (const issue of issues.slice(0, 100)) {
      lines.push(`- ${issue.type}: ${issue.slug}${issue.sku ? ` (${issue.sku})` : ""}`);
    }
    if (issues.length > 100) lines.push(`- ... and ${issues.length - 100} more`);
  }

  fs.mkdirSync(path.dirname(VERIFICATION_MD), { recursive: true });
  fs.writeFileSync(VERIFICATION_MD, lines.join("\n"), "utf8");

  console.log("Verification:", payload.pass ? "PASS" : "FAIL");
  console.log("Report:", VERIFICATION_MD);
  if (!payload.pass) process.exitCode = 1;
  return payload;
}

if (require.main === module) {
  runVerification().catch((error) => {
    console.error("FATAL:", error.message);
    process.exit(1);
  });
}

module.exports = { runVerification };
