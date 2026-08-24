"use strict";

const {
  DEVICE_TARGETS,
  MOBILECENTRE_CATEGORY_URLS,
  MOBILECENTRE_KNOWN_PRODUCT_URLS,
  DYSON_EXTRA_SEARCH_QUERIES,
  buildSearchQueries,
} = require("../targets.cjs");
const { fetchHtml, stripTags } = require("../http.cjs");
const {
  cleanText,
  parentModelKey,
  matchesTarget,
  extractVariantOptions,
  isDysonHardRejected,
  isPlayStationHardRejected,
  isDysonHairDevice,
  isPlayStationConsoleProduct,
  isPlayStationGame,
  isPlayStationAccessoryProduct,
  categoryForParentModel,
} = require("../normalize.cjs");
const { buildDescriptionHtml } = require("../../../shared/mobilecentre-description-html.cjs");

const BASE_URL = "https://www.mobilecentre.am";
const REQUEST_SLEEP_SEARCH = 200;
const REQUEST_SLEEP_PRODUCT = 250;
const MAX_VARIANTS_PER_SEED = 24;

function absUrl(href, base = BASE_URL) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  return `${base}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function normalizeProductPid(raw) {
  if (!raw) return null;
  const match = String(raw).match(/(\d+)/);
  return match ? match[1] : null;
}

function canonicalProductUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, BASE_URL);
    const pidFromQuery = parsed.searchParams.get("pid");
    if (pidFromQuery) {
      const pid = normalizeProductPid(pidFromQuery);
      return pid ? `${BASE_URL}/index.php?m=prod&pid=${pid}` : null;
    }
    const pathMatch = parsed.pathname.match(/\/product\/[^/]+\/(\d+)\/?/);
    if (pathMatch) {
      return `${BASE_URL}/product/${pathMatch[0].split("/product/")[1]}`.replace(/\/$/, "") + "/";
    }
    if (parsed.pathname.includes("/product/")) {
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") + "/";
    }
    return null;
  } catch {
    return null;
  }
}

function extractSourcePid(productUrl, pageText = "") {
  try {
    const parsed = new URL(productUrl, BASE_URL);
    const pidFromQuery = parsed.searchParams.get("pid");
    if (pidFromQuery) return normalizeProductPid(pidFromQuery);
    const pathMatch = parsed.pathname.match(/\/product\/[^/]+\/(\d+)\/?/);
    if (pathMatch) return pathMatch[1];
    const idMatch = pageText.match(/\bID\s*:\s*([\d,]+)/i);
    if (idMatch) return normalizeProductPid(idMatch[1]);
  } catch {
    return null;
  }
  return null;
}

function isLikelyProductHref(url) {
  const lower = url.toLowerCase();
  return lower.includes("/product/") || lower.includes("m=prod");
}

function extractProductLinksFromHtml(html, currentUrl) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const full = absUrl(match[1], currentUrl);
    if (!full || !full.includes("mobilecentre.am")) continue;
    if (!isLikelyProductHref(full)) continue;
    const canonical = canonicalProductUrl(full);
    if (canonical) links.add(canonical);
  }
  return [...links];
}

function findNextPageUrls(html, currentUrl) {
  const urls = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = match[1];
    const lower = href.toLowerCase();
    if (!lower.includes("search") && !lower.includes("page=") && !lower.includes("p=")) continue;
    const full = absUrl(href, currentUrl);
    if (full) urls.add(full);
  }
  return [...urls];
}

async function scrapeSearchResults(query) {
  const startUrl = `${BASE_URL}/search/?searchData=${encodeURIComponent(query)}`;
  const queue = [startUrl];
  const visited = new Set();
  const productLinks = new Set();

  while (queue.length && visited.size < 20) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let text;
    try {
      ({ text } = await fetchHtml(url, { sleepMs: REQUEST_SLEEP_SEARCH }));
    } catch (error) {
      console.warn(`[mobilecentre] search page failed: ${url} -> ${error.message}`);
      continue;
    }

    for (const link of extractProductLinksFromHtml(text, url)) productLinks.add(link);
    for (const next of findNextPageUrls(text, url)) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return [...productLinks];
}

function stripRelatedHtml(html) {
  const markers = ["Նմանատիպ ապրանքներ", "Similar products", "Related products"];
  let cut = html.length;
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx > 0) cut = Math.min(cut, idx);
  }
  return html.slice(0, cut);
}

function extractName(html) {
  const ogMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  let name = ogMatch ? stripTags(ogMatch[1]) : "";
  if (!name) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    name = h1Match ? stripTags(h1Match[1]) : "";
  }
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    name = titleMatch ? stripTags(titleMatch[1]) : "";
  }
  for (const prefix of ["Mobile Centre. -", "Mobile Centre -", "Mobile Centre.", "Mobile Centre"]) {
    if (name.startsWith(prefix)) name = name.slice(prefix.length).trim();
  }
  return cleanText(name);
}

function extractPrice(html) {
  const pageHtml = stripRelatedHtml(html);
  const pageText = stripTags(pageHtml);
  const match = pageText.match(/Գին՝\s*([\d,\s]+)\s*դր/i);
  if (!match) return null;
  const value = match[1].replace(/[^\d]/g, "");
  return value ? Number(value) : null;
}

function isValidProductImage(url) {
  const lower = url.toLowerCase();
  if (!lower.includes("/img/prodpic/")) return false;
  if (lower.includes("/small/")) return false;
  if (lower.includes("nowimg")) return false;
  if (lower.endsWith("/img/prodpic/")) return false;
  return true;
}

function extractImages(html) {
  const images = [];
  const seen = new Set();

  const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) {
    const imgUrl = absUrl(ogMatch[1]);
    if (imgUrl && isValidProductImage(imgUrl)) {
      images.push(imgUrl);
      seen.add(imgUrl);
    }
  }

  const imgRe = /<img[^>]+(?:src|data-src|data-original|data-lazy|data-image)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRe.exec(html))) {
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
  const chunk = containerMatch[1];
  const stopIdx = chunk.search(/Նմանատիպ ապրանքներ|Similar products|Related products/i);
  const text = stopIdx > 0 ? chunk.slice(0, stopIdx) : chunk;
  return stripTags(text).slice(0, 4000);
}

function extractVariantLinks(html, currentUrl) {
  const topHtml = html.slice(0, Math.min(html.length, 120000));
  return extractProductLinksFromHtml(topHtml, currentUrl);
}

function isRelevantDevice(name, url) {
  const text = `${name} ${url}`.toLowerCase();
  const dyson = /\bdyson\b/.test(text);
  const ps = /\b(playstation|ps4|ps5|sony)\b/.test(text);
  if (!dyson && !ps) return false;
  if (dyson && (isDysonHardRejected(name, name, url) || !isDysonHairDevice(name, name, url))) return false;
  if (ps) {
    if (isPlayStationHardRejected(name, name, url)) return false;
    if (isPlayStationGame(name, name, url)) return false;
    if (isPlayStationAccessoryProduct(name, name, url)) return false;
    if (!isPlayStationConsoleProduct(name, name, url)) return false;
  }
  return true;
}

function extractStockStatus(html, price) {
  const text = stripTags(html);
  if (/Առկա չէ խանութներում|out of stock/i.test(text)) return "out_of_stock";
  if (/Առկա է խանութներում|in stock/i.test(text)) return "in_stock";
  return price ? "in_stock" : "unknown";
}

function productMatchesAnyTarget(name, url, targets) {
  const normalized = parentModelKey(name, name, url);
  const target = targets.find((row) => normalizeParent(row.model) === normalizeParent(normalized));
  if (!target) {
    return { ok: false, reason: "no_target_match", normalized };
  }
  const match = matchesTarget(target.model, name, url);
  if (!match.ok) return { ok: false, reason: match.reason, normalized };
  return { ok: true, target: target.model, normalized, type: target.type };
}

function normalizeParent(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function parseProductPage(productUrl, targets) {
  let text;
  try {
    ({ text } = await fetchHtml(productUrl, { sleepMs: REQUEST_SLEEP_PRODUCT }));
  } catch (error) {
    return { variant: null, links: [], error: error.message };
  }

  const pageHtml = stripRelatedHtml(text);
  const pageText = stripTags(pageHtml);
  const name = extractName(pageHtml);
  if (!name) return { variant: null, links: [], error: "missing_name" };
  if (!isRelevantDevice(name, productUrl)) {
    return { variant: null, links: [], error: "not_relevant_device" };
  }

  const targetMatch = productMatchesAnyTarget(name, productUrl, targets);
  if (!targetMatch.ok) {
    return { variant: null, links: [], error: targetMatch.reason, name };
  }

  const gallery = extractImages(pageHtml);
  const imageUrl = gallery[0] || null;
  const price = extractPrice(text);
  const sourcePid = extractSourcePid(productUrl, pageText);
  const canonicalUrl = canonicalProductUrl(productUrl) || productUrl;
  const options = extractVariantOptions(name, targetMatch.normalized, canonicalUrl);
  const description = extractDescription(pageHtml);
  const descriptionHtml = description ? buildDescriptionHtml(description) : null;
  const category =
    categoryForParentModel(targetMatch.normalized) ||
    (targetMatch.type === "dyson" ? "Hair Dryers" : "Game Consoles");

  const variant = {
    source: "mobilecentre",
    source_name: "MobileCentre",
    source_url: canonicalUrl,
    source_pid: sourcePid,
    sku: sourcePid ? `mc-${sourcePid}` : null,
    name,
    model: targetMatch.normalized,
    normalized_model: targetMatch.normalized,
    target_model: targetMatch.target,
    product_type: targetMatch.type,
    category,
    price,
    currency: "AMD",
    stock_status: extractStockStatus(pageHtml, price),
    description,
    descriptionHtml,
    specifications: description,
    options,
    image_url: imageUrl,
    gallery,
    gallery_by_color: options.color ? { [options.color]: gallery } : {},
    variant_source_type: "separate_url",
  };

  const links = extractVariantLinks(text, productUrl);
  return { variant, links, error: null };
}

async function scrapeProductWithVariants(seedUrl, targets) {
  const seedCanonical = canonicalProductUrl(seedUrl);
  if (!seedCanonical) return [];

  const queue = [seedCanonical];
  const localSeenUrls = new Set();
  const localSeenPids = new Set();
  const variants = [];
  let seedVariant = null;

  while (queue.length && localSeenUrls.size < MAX_VARIANTS_PER_SEED) {
    const url = queue.shift();
    const canonical = canonicalProductUrl(url);
    if (!canonical) continue;

    const pid = extractSourcePid(canonical, "");
    if (pid && localSeenPids.has(pid)) continue;
    if (localSeenUrls.has(canonical)) continue;
    localSeenUrls.add(canonical);
    if (pid) localSeenPids.add(pid);

    const { variant, links } = await parseProductPage(canonical, targets);
    if (!variant) continue;

    const alreadyHave = variants.some(
      (row) =>
        String(row.source_pid) === String(variant.source_pid) &&
        normalizeParent(row.normalized_model) === normalizeParent(variant.normalized_model),
    );
    if (alreadyHave) continue;

    if (!seedVariant) seedVariant = variant;
    variants.push(variant);

    for (const link of links) {
      const linkCanonical = canonicalProductUrl(link);
      if (linkCanonical && !localSeenUrls.has(linkCanonical)) {
        queue.push(linkCanonical);
      }
    }
  }

  return variants;
}

async function searchMobileCentre(targets = DEVICE_TARGETS) {
  const seedUrls = new Set();
  const rejected = [];
  const failed = [];

  const queries = new Set();
  for (const target of targets) {
    for (const query of buildSearchQueries(target)) queries.add(query);
  }
  if (targets.some((target) => target.type === "dyson")) {
    DYSON_EXTRA_SEARCH_QUERIES.forEach((query) => queries.add(query));
  }

  for (const query of queries) {
    let links = [];
    try {
      links = await scrapeSearchResults(query);
    } catch (error) {
      failed.push({ source: "mobilecentre", query, error: error.message });
      continue;
    }
    links.forEach((link) => seedUrls.add(link));
  }

  MOBILECENTRE_KNOWN_PRODUCT_URLS.forEach((url) => seedUrls.add(url));

  for (const categoryUrl of MOBILECENTRE_CATEGORY_URLS) {
    try {
      const { text } = await fetchHtml(categoryUrl, { sleepMs: REQUEST_SLEEP_SEARCH });
      extractProductLinksFromHtml(text, categoryUrl).forEach((link) => seedUrls.add(link));
    } catch {
      console.warn(`[mobilecentre] category failed: ${categoryUrl}`);
    }
  }

  const flatByKey = new Map();

  for (const seedUrl of seedUrls) {
    try {
      const variants = await scrapeProductWithVariants(seedUrl, targets);
      for (const variant of variants) {
        const dedupeKey = `${variant.source}|${variant.source_pid}|${variant.normalized_model}`;
        if (flatByKey.has(dedupeKey)) continue;
        if (!variant.price || variant.price <= 0) {
          rejected.push({
            product: variant.name,
            target: variant.target_model,
            source: "mobilecentre",
            url: variant.source_url,
            reason: "missing_price",
          });
          continue;
        }
        if (!variant.image_url) {
          rejected.push({
            product: variant.name,
            target: variant.target_model,
            source: "mobilecentre",
            url: variant.source_url,
            reason: "missing_image",
          });
          continue;
        }
        flatByKey.set(dedupeKey, variant);
      }
    } catch (error) {
      failed.push({ source: "mobilecentre", url: seedUrl, error: error.message });
    }
  }

  const flat = [...flatByKey.values()];

  console.log(`[mobilecentre] ${flat.length} flat variants scraped (${seedUrls.size} seeds)`);
  return { variants: flat, rejected, failed };
}

module.exports = {
  searchMobileCentre,
  parseProductPage,
  scrapeSearchResults,
  canonicalProductUrl,
};
