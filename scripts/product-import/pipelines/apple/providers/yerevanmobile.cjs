"use strict";

const { YEREVANMOBILE_CATEGORY_URLS, buildSearchQueries } = require("../targets.cjs");
const { fetchHtml, stripTags } = require("../http.cjs");
const { cleanText, parentModelKey, matchesTarget, isThirdPartyAccessory, slugify } = require("../normalize.cjs");

const BASE = "https://www.yerevanmobile.am";

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  return `${BASE}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function extractProductLinks(html) {
  const links = new Set();
  const re = /href=["']([^"']*\/apple[^"']*\.html)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = absUrl(m[1]);
    if (u && /yerevanmobile\.am/.test(u)) links.add(u);
  }
  return [...links];
}

function slugCandidatesForTarget(model) {
  const base = slugify(model.replace(/^Apple\s+/i, ""));
  const cands = new Set([
    `${BASE}/en/apple-${base}.html`,
    `${BASE}/en/apple-${base.replace(/-/g, "")}.html`,
    `${BASE}/am/apple-${base}.html`,
  ]);
  const custom = {
    "iPhone 16e": ["apple-iphone-16e"],
    "iPad Air 11 M4": ["apple-ipad-air-11-m4", "ipad-air-11"],
    "iPad Air 13 M4": ["apple-ipad-air-13-m4", "ipad-air-13"],
    "iPad Pro 11 M5": ["apple-ipad-pro-11"],
    "iPad Pro 13 M5": ["apple-ipad-pro-13"],
    "MacBook Air 15-inch M4": ["apple-macbook-air-15"],
    "Mac mini M5": ["apple-mac-mini"],
    "iMac": ["apple-imac"],
    "AirPods Max 2": ["apple-airpods-max"],
    "MagSafe Charger 25W Qi2": ["apple-magsafe-charger"],
  };
  if (custom[model]) {
    for (const s of custom[model]) {
      cands.add(`${BASE}/en/${s}.html`);
      cands.add(`${BASE}/am/${s}.html`);
    }
  }
  return [...cands];
}

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1b ? stripTags(h1b[1]) : null;
}

function parseYmGalleryFromHtml(html) {
  const marker = '"[data-gallery-role=gallery-placeholder]"';
  const idx = html.indexOf(marker);
  if (idx < 0) return [];
  const dataMatch = html.slice(idx, idx + 120000).match(/"data"\s*:\s*(\[[\s\S]*?\])\s*,\s*"options"/);
  if (!dataMatch) return [];
  try {
    const items = JSON.parse(dataMatch[1]);
    const sorted = [...items].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return Number(a.position || 0) - Number(b.position || 0);
    });
    const seen = new Set();
    const urls = [];
    for (const item of sorted) {
      const url = item.full || item.img || item.thumb;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
    return urls;
  } catch {
    return [];
  }
}

function parseImages(html) {
  const fromGalleryJson = parseYmGalleryFromHtml(html);
  if (fromGalleryJson.length) return fromGalleryJson.slice(0, 12);

  const imgs = new Set();
  const re = /https:\/\/www\.yerevanmobile\.am\/media\/catalog\/product\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = m[0];
    if (/logo|brand|placeholder|magsafe|usb-c|lightning|adapter|power_adapter|orig_1|airpods|magasafe|\/a\/i\/|\/b\/l\/|\/1\/2\/123/i.test(u)) {
      continue;
    }
    imgs.add(u);
  }
  return [...imgs].slice(0, 12);
}

function parseConfigurableVariants(html, baseTitle, url) {
  const variants = [];
  const swatches = [...html.matchAll(/data-option-label=\"([^\"]+)\"[^>]*data-price-amount=\"(\d+)\"/g)];
  const gallery = parseImages(html);
  const image_url = gallery[0] || null;

  if (swatches.length) {
    for (const [, label, priceStr] of swatches) {
      const price = parseInt(priceStr, 10);
      if (price < 30000) continue;
      const opts = {};
      if (/gb|tb/i.test(label)) opts.storage = label;
      else opts.color = label;
      variants.push({ name: `${baseTitle} (${label})`, options: opts, price });
    }
  }

  if (!variants.length) {
    const mainPrice = [...html.matchAll(/data-price-amount=\"(\d+)\"/g)]
      .map((m) => parseInt(m[1], 10))
      .filter((n) => n >= 100000)
      .sort((a, b) => a - b);
    const price = mainPrice[0];
    if (price) variants.push({ name: baseTitle, options: {}, price });
  }

  if (!variants.length) return [];

  return variants.map((v, idx) => ({
    source: "yerevanmobile",
    source_name: "YerevanMobile",
    source_url: url,
    source_pid: `${url.split("/").pop()?.replace(".html", "")}-${idx}`,
    sku: `ym-${url.split("/").pop()?.replace(".html", "")}-${idx}`,
    name: v.name,
    model: parentModelKey(baseTitle),
    normalized_model: parentModelKey(baseTitle),
    category: null,
    price: v.price,
    currency: "AMD",
    stock_status: /out of stock|չկա/i.test(html) ? "out_of_stock" : "in_stock",
    description: "",
    descriptionHtml: null,
    specifications: "",
    options: Object.fromEntries(Object.entries(v.options || {}).filter(([, val]) => val)),
    image_url,
    gallery,
    gallery_by_color: {},
    variant_source_type: swatches.length ? "configurable_options" : "parent_price_list",
  }));
}

async function parseProductPage(url) {
  const { text, status } = await fetchHtml(url);
  if (status >= 400 || text.length < 1000) return null;
  const title = parseTitle(text);
  if (!title || !/apple/i.test(title)) return null;
  const gallery = parseImages(text);
  if (!gallery.length) return null;
  return parseConfigurableVariants(text, title, url);
}

async function searchYerevanMobile(targets) {
  const variants = [];
  const rejected = [];
  const tried = new Set();

  for (const t of targets) {
    for (const q of buildSearchQueries(t)) {
      for (const url of slugCandidatesForTarget(q)) {
        if (tried.has(url)) continue;
        tried.add(url);
        let items;
        try {
          items = await parseProductPage(url);
        } catch {
          continue;
        }
        if (!items?.length) continue;
        const title = items[0].name.replace(/\s*\([^)]+\)$/, "");
        const m = matchesTarget(t.model, title, url);
        if (!m.ok) {
          rejected.push({ target: t.model, url, reason: m.reason, product: title, source: "yerevanmobile" });
          continue;
        }
        if (isThirdPartyAccessory(title)) continue;
        for (const item of items) {
          item.target_model = t.model;
          item.normalized_model = parentModelKey(title);
          variants.push(item);
        }
        break;
      }
    }
  }

  for (const catUrl of YEREVANMOBILE_CATEGORY_URLS) {
    let links = [];
    try {
      const { text } = await fetchHtml(catUrl);
      links = extractProductLinks(text);
    } catch (e) {
      console.warn(`[yerevanmobile] category failed: ${catUrl}`);
      continue;
    }
    for (const url of links) {
      if (tried.has(url)) continue;
      tried.add(url);
      let items;
      try {
        items = await parseProductPage(url);
      } catch {
        continue;
      }
      if (!items?.length) continue;
      const title = items[0].name.replace(/\s*\([^)]+\)$/, "");
      for (const t of targets) {
        const m = matchesTarget(t.model, title, url);
        if (!m.ok) continue;
        for (const item of items) {
          item.target_model = t.model;
          item.normalized_model = parentModelKey(title);
          variants.push(item);
        }
        break;
      }
    }
  }

  console.log(`[yerevanmobile] ${variants.length} matched variants`);
  return { variants, rejected };
}

module.exports = { searchYerevanMobile, parseProductPage, slugCandidatesForTarget };
