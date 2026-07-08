"use strict";

const { fetchHtml, stripTags } = require("../apple/http.cjs");
const { matchWhitelistModel, isHardRejected, isAccessory } = require("./whitelist.cjs");
const { variantDedupeKey } = require("./normalize.cjs");
const {
  normalizeManualCandidateUrl,
  buildMobileCentreFetchUrls,
  normalizeProductPid,
  BASE_URL,
} = require("./mobilecentre-url.cjs");

const MIN_PHONE_PRICE_AMD = 50000;

function stripRelatedHtml(html) {
  const markers = ["Նմանատիպ ապրանքներ", "Similar products", "Related products", "Այլ առաջարկներ"];
  let cut = html.length;
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx > 0) cut = Math.min(cut, idx);
  }
  return html.slice(0, cut);
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function extractName(html) {
  const pageHtml = stripRelatedHtml(html);
  const ogMatch = pageHtml.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  let name = ogMatch ? stripTags(ogMatch[1]) : "";
  if (!name) {
    const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    name = h1Match ? stripTags(h1Match[1]) : "";
  }
  for (const prefix of ["Mobile Centre. -", "Mobile Centre -", "Mobile Centre.", "Mobile Centre"]) {
    if (name.startsWith(prefix)) name = name.slice(prefix.length).trim();
  }
  return name.replace(/\s+/g, " ").trim();
}

function extractPrice(html) {
  const pageText = stripTags(stripRelatedHtml(html));
  const match = pageText.match(/Գին՝\s*([\d,\s]+)\s*դր/i);
  if (!match) return null;
  const value = match[1].replace(/[^\d]/g, "");
  return value ? Number(value) : null;
}

function extractVisibleId(html) {
  const pageText = stripTags(stripRelatedHtml(html));
  const match = pageText.match(/\bID\s*:\s*([\d,]+)/i);
  return match ? match[1].replace(/\s/g, "") : null;
}

function isValidProductImage(url) {
  const lower = url.toLowerCase();
  return (
    lower.includes("/img/prodpic/") &&
    !lower.includes("/small/") &&
    !lower.includes("nowimg") &&
    !lower.endsWith("/img/prodpic/")
  );
}

function extractImages(html) {
  const images = [];
  const seen = new Set();
  const pageHtml = stripRelatedHtml(html);

  const ogMatch = pageHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) {
    const imgUrl = absUrl(ogMatch[1]);
    if (imgUrl && isValidProductImage(imgUrl)) {
      images.push(imgUrl);
      seen.add(imgUrl);
    }
  }

  const imgRe = /<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRe.exec(pageHtml))) {
    const full = absUrl(match[1]);
    if (!full || !isValidProductImage(full) || seen.has(full)) continue;
    seen.add(full);
    images.push(full);
  }

  return images;
}

function extractDescription(html) {
  const containerMatch = html.match(/Ընդհանուր բնութագրեր([\s\S]{0,8000})/i);
  if (!containerMatch) return "";
  return stripTags(containerMatch[1]).slice(0, 4000);
}

function extractVariantOptions(name, pageText) {
  const options = {};
  const hay = `${name} ${pageText}`;

  const colorMatch = name.match(/\(([^)]+)\)\s*$/);
  if (colorMatch) options.color = colorMatch[1].trim();

  const storageMatch = hay.match(/\b(\d+\s*(?:GB|TB))\b/i);
  if (storageMatch) options.storage = storageMatch[1].replace(/\s+/g, "").toUpperCase();

  const ramMatch = hay.match(/\b(\d+\s*GB)\s*\/\s*(\d+\s*GB)\b/i);
  if (ramMatch) {
    options.ram = ramMatch[1].replace(/\s+/g, "").toUpperCase();
    options.storage = ramMatch[2].replace(/\s+/g, "").toUpperCase();
  }

  if (/\b5g\b/i.test(hay)) options.connectivity = "5G";
  else if (/\b4g\b|\blte\b/i.test(hay)) options.connectivity = "4G";

  return Object.fromEntries(Object.entries(options).filter(([, value]) => value));
}

function parseSamsungMobileCentrePage(html, canonicalUrl, targetModel) {
  const pageHtml = stripRelatedHtml(html);
  const pageText = stripTags(pageHtml);
  const name = extractName(pageHtml);
  if (!name) return { ok: false, reason: "missing_name" };

  if (isHardRejected(name) || isAccessory(name)) {
    return { ok: false, reason: isAccessory(name) ? "accessory" : "hard_reject", name };
  }

  const whitelist = matchWhitelistModel(name);
  if (!whitelist.model) return { ok: false, reason: whitelist.reason || "not_in_whitelist", name };
  if (whitelist.model !== targetModel) {
    return { ok: false, reason: `matched_other_model:${whitelist.model}`, name };
  }
  if (/a16\s*5g/i.test(name)) return { ok: false, reason: "a16_5g", name };

  const price = extractPrice(html);
  if (!price || price < MIN_PHONE_PRICE_AMD) {
    return { ok: false, reason: "missing_or_invalid_price", name, price };
  }

  const gallery = extractImages(pageHtml);
  const imageUrl = gallery[0] || null;
  if (!imageUrl) return { ok: false, reason: "missing_image", name };

  const sourcePid = normalizeProductPid(canonicalUrl) || extractSourcePid(canonicalUrl, pageText);
  const visibleId = extractVisibleId(html);
  const options = extractVariantOptions(name, pageText);

  return {
    ok: true,
    variant: {
      source: "mobilecentre",
      source_url: canonicalUrl,
      product_url: canonicalUrl,
      source_pid: sourcePid,
      visible_id: visibleId,
      sku: sourcePid ? `mobilecentre-${sourcePid}` : null,
      name,
      model: targetModel,
      price,
      currency: "AMD",
      stock_status: /out of stock|չկա|unavailable/i.test(html) ? "out_of_stock" : "in_stock",
      options,
      image_url: imageUrl,
      gallery,
      description: extractDescription(html),
      dedupe_key: variantDedupeKey({ name, model: targetModel, source_pid: sourcePid, options }),
    },
    pageText,
  };
}

function extractSourcePid(productUrl, pageText = "") {
  try {
    const parsed = new URL(productUrl, BASE_URL);
    const pidFromQuery = normalizeProductPid(parsed.searchParams.get("pid"));
    if (pidFromQuery) return pidFromQuery;
    const pathMatch = parsed.pathname.match(/\/product\/[^/]+\/(\d+)\/?$/i);
    if (pathMatch) return pathMatch[1];
  } catch {
    // fall through
  }
  const idMatch = pageText.match(/\bID\s*:\s*([\d,]+)/i);
  return idMatch ? normalizeProductPid(idMatch[1]) : null;
}

function validateA16ExpectedContent(parsed) {
  const { variant, pageText } = parsed;
  const failures = [];

  if (!/Samsung Galaxy A16\s+128GB\s*\(Black\)/i.test(variant.name)) {
    failures.push("title_mismatch");
  }
  if (variant.model !== "Samsung Galaxy A16") failures.push("model_mismatch");
  if (/a16\s*5g/i.test(`${variant.name} ${pageText}`)) failures.push("a16_5g");
  if (variant.visible_id && variant.visible_id.replace(/,/g, "") !== "124352") {
    failures.push("visible_id_mismatch");
  }
  if (variant.price !== 57900) failures.push("price_mismatch");
  if (!/gsm\s*\/\s*hspa\s*\/\s*lte/i.test(pageText)) failures.push("network_mismatch");
  if (!/128\s*gb/i.test(pageText)) failures.push("storage_mismatch");
  if (!/galaxy\s+a16/i.test(pageText)) failures.push("spec_model_mismatch");

  return failures;
}

async function fetchAndParseMobileCentreProduct(candidateUrl, targetModel, { validateA16 = false } = {}) {
  const normalized = normalizeManualCandidateUrl(candidateUrl);
  if (!normalized.ok) {
    return { status: "invalid_url", reason: normalized.error, candidateUrl };
  }

  const notes = [normalized.canonicalUrl];
  const fetchUrls = buildMobileCentreFetchUrls(normalized.canonicalUrl);

  for (const fetchUrl of fetchUrls) {
    notes.push(fetchUrl);
    let text;
    let status;
    try {
      ({ text, status } = await fetchHtml(fetchUrl, { sleepMs: 150 }));
    } catch (error) {
      notes.push(`fetch_error:${error.message}`);
      continue;
    }
    if (status >= 400 || text.length < 800) continue;

    const parsed = parseSamsungMobileCentrePage(text, normalized.canonicalUrl, targetModel);
    if (!parsed.ok) {
      notes.push(`parse:${parsed.reason}`);
      continue;
    }

    if (validateA16) {
      const failures = validateA16ExpectedContent(parsed);
      if (failures.length) {
        return {
          status: "content_mismatch",
          reason: failures.join(","),
          canonicalUrl: normalized.canonicalUrl,
          title: parsed.variant.name,
          notes,
          failures,
        };
      }
    }

    return {
      status: "ready",
      canonicalUrl: normalized.canonicalUrl,
      fetchUrl,
      title: parsed.variant.name,
      variant: parsed.variant,
      notes,
    };
  }

  return {
    status: "not_found",
    reason: "product_page_unavailable",
    canonicalUrl: normalized.canonicalUrl,
    notes,
  };
}

module.exports = {
  MIN_PHONE_PRICE_AMD,
  parseSamsungMobileCentrePage,
  fetchAndParseMobileCentreProduct,
  validateA16ExpectedContent,
  normalizeManualCandidateUrl,
};
