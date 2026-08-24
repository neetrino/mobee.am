"use strict";

const { ISPACE_CATEGORY_URLS } = require("../targets.cjs");
const { fetchHtml, decodeHtml, stripTags } = require("../http.cjs");
const { cleanText, parentModelKey, matchesTarget, isThirdPartyAccessory } = require("../normalize.cjs");

const BASE = "https://ispace.am";

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  if (href.startsWith("//")) return `https:${href.split("#")[0]}`;
  return `${BASE}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function extractProductLinks(html) {
  const links = new Set();
  const re = /href=["'](\/en\/product\/[^"'?#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) links.add(absUrl(m[1]));
  return [...links];
}

function parsePrice(text) {
  const og = text.match(/property="og:title" content="[^"]*price of (\d[\d\s]*)\s*֏/i);
  if (og) return parseInt(og[1].replace(/\s/g, ""), 10);
  const title = text.match(/<title[^>]*>[^<]*price of (\d[\d\s]*)\s*֏/i);
  if (title) return parseInt(title[1].replace(/\s/g, ""), 10);
  const amounts = [...text.matchAll(/(\d{3,7})\s*֏/g)].map((m) => parseInt(m[1].replace(/\s/g, ""), 10));
  const valid = amounts.filter((n) => n >= 10000);
  return valid.length ? Math.max(...valid) : null;
}

function parseTitle(text) {
  const og = text.match(/property="og:title" content="([^"]+)"/i);
  if (og) {
    const t = decodeHtml(og[1]);
    return cleanText(t.split(" buy at")[0].split(" buy ")[0].split(" purchase:")[0]);
  }
  const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).split(" purchase:")[0].trim();
  return null;
}

function parseImages(text) {
  const imgs = new Set();
  const re = /https:\/\/prod-cdn\.prod\.asbis\.io\/s3\/cms\/product\/[^"'\s)]+\.(?:webp|jpg|jpeg|png)/gi;
  let m;
  while ((m = re.exec(text))) imgs.add(m[0].split("?")[0]);
  return [...imgs];
}

function parseSku(text, url) {
  const skuMatch = text.match(/\b([A-Z0-9]{5,12}\/[A-Z])\b/);
  if (skuMatch) return skuMatch[1];
  const slug = url.split("/").pop() || "";
  const tail = slug.match(/-([a-z0-9]{5,12}-[a-z])$/i);
  return tail ? tail[1].toUpperCase() : null;
}

function parseOptionsFromTitle(title) {
  const opts = {};
  const storage = title.match(/\b(128|256|512|1024|2048)\s*GB\b/i);
  if (storage) opts.storage = `${storage[1]}GB`;
  const memory = title.match(/\b(\d+)\s*GB\s*(?:unified|memory|RAM)\b/i);
  if (memory) opts.memory = `${memory[1]}GB`;
  if (/wi-fi \+ cellular|wifi \+ cellular|cellular/i.test(title)) opts.connectivity = "Wi-Fi + Cellular";
  else if (/wi-fi|wifi/i.test(title)) opts.connectivity = "Wi-Fi";
  const colorPart = title.split(",").pop() || "";
  if (
    colorPart &&
    !/gb|wi-fi|wifi|cellular|glass|standard|nano|installment|ispace/i.test(colorPart) &&
    colorPart.length < 30
  ) {
    opts.color = cleanText(colorPart);
  }
  if (/nano-texture|nanotexture/i.test(title)) opts.glass = "Nano-texture glass";
  else if (/standard glass/i.test(title)) opts.glass = "Standard glass";
  const chip = title.match(/\b(M[1-9]\d?(?:\s+Pro|\s+Max)?|A\d{2})\b/i);
  if (chip) opts.chip = chip[1].replace(/\s+/g, " ");
  const size = title.match(/\b(11|13|14|15|16)(?:\.\d)?[\s-]*(?:inch|")?\b/i);
  if (size) opts.size = `${size[1]}-inch`;
  return opts;
}

function parseStock(text) {
  if (/out of stock|sold out|unavailable|չկա/i.test(text)) return "out_of_stock";
  if (/preorder|pre-order|նախապատվ/i.test(text)) return "preorder";
  return "in_stock";
}

async function parseProductPage(url) {
  const { text, status } = await fetchHtml(url);
  if (status >= 400) return null;
  const title = parseTitle(text);
  if (!title) return null;
  const price = parsePrice(text);
  const gallery = parseImages(text);
  const image_url = gallery[0] || null;
  const options = parseOptionsFromTitle(title);
  const sku = parseSku(text, url);
  const stock_status = parseStock(text);
  if (!image_url) return null;

  return {
    source: "ispace",
    source_name: "iSpace",
    source_url: url,
    source_pid: sku || url.split("/").pop(),
    sku: sku ? `ispace-${sku.replace(/\//g, "-")}` : `ispace-${url.split("/").pop()}`,
    name: title,
    model: parentModelKey(title),
    normalized_model: parentModelKey(title),
    category: null,
    price,
    currency: "AMD",
    stock_status,
    description: "",
    descriptionHtml: null,
    specifications: "",
    options,
    image_url,
    gallery,
    gallery_by_color: options.color ? { [options.color]: gallery } : {},
    variant_source_type: "separate_url",
  };
}

async function discoverFromCategories(seen) {
  const urls = new Set();
  for (const catUrl of ISPACE_CATEGORY_URLS) {
    try {
      const { text } = await fetchHtml(catUrl);
      for (const link of extractProductLinks(text)) {
        if (!seen.has(link)) urls.add(link);
      }
    } catch (e) {
      console.warn(`[ispace] category fetch failed: ${catUrl} -> ${e.message}`);
    }
  }
  return [...urls];
}

const { NO_PRICE_IMPORT_ALLOWLIST } = require("../no-price-allowlist.cjs");

async function searchISpace(targets, { allowNoPrice = false } = {}) {
  const seenUrls = new Set();
  const variants = [];
  const rejected = [];

  const productUrls = await discoverFromCategories(seenUrls);
  console.log(`[ispace] discovered ${productUrls.length} product URLs from categories`);

  for (const url of productUrls) {
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    let item;
    try {
      item = await parseProductPage(url);
    } catch (e) {
      console.warn(`[ispace] product parse failed: ${url} -> ${e.message}`);
      continue;
    }
    if (!item) continue;
    if (isThirdPartyAccessory(item.name)) continue;

    let matchedTarget = null;
    for (const t of targets) {
      const m = matchesTarget(t.model, item.name, url);
      if (m.ok) {
        matchedTarget = t.model;
        item.normalized_model = parentModelKey(item.name);
        item.target_model = t.model;
        break;
      }
    }
    if (!matchedTarget) continue;

    if (!item.price || item.price < 5000) {
      if (allowNoPrice && NO_PRICE_IMPORT_ALLOWLIST.has(matchedTarget)) {
        item.price = 0;
        item.price_on_request = true;
        item.stock_status = item.stock_status || "unknown";
        variants.push(item);
        continue;
      }
      rejected.push({ target: matchedTarget, url, reason: "missing_or_invalid_price", source: "ispace" });
      continue;
    }

    variants.push(item);
  }

  console.log(`[ispace] ${variants.length} matched variants`);
  return { variants, rejected };
}

module.exports = { searchISpace, parseProductPage, extractProductLinks };
