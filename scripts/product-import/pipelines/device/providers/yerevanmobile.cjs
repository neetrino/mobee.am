"use strict";

const {
  DEVICE_TARGETS,
  YEREVANMOBILE_CATEGORY_URLS,
  YEREVANMOBILE_KNOWN_PRODUCT_URLS,
  buildSearchQueries,
} = require("../targets.cjs");
const { fetchHtml } = require("../http.cjs");
const { parseMainProductPrice, parseTitle: parseYmTitle } = require("./yerevanmobile-price.cjs");
const {
  cleanText,
  parentModelKey,
  matchesTarget,
  extractVariantOptions,
  slugify,
  normalize,
  isDysonHardRejected,
  isPlayStationHardRejected,
  isHairDryerProduct,
  isPlayStationConsoleProduct,
  isPlayStationGame,
  isPlayStationAccessoryProduct,
} = require("../normalize.cjs");

const BASE = "https://www.yerevanmobile.am";

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href.split("#")[0];
  return `${BASE}${href.startsWith("/") ? "" : "/"}${href}`.split("#")[0];
}

function extractProductLinks(html) {
  const links = new Set();
  const re = /href=["']([^"']*\.html)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = absUrl(match[1]);
    if (!url || !url.includes("yerevanmobile.am")) continue;
    if (/catalogsearch|customer|checkout|wishlist|cart|login|register|contact|about|privacy|terms/i.test(url)) {
      continue;
    }
    links.add(url);
  }
  return [...links];
}

function slugCandidatesForTarget(model) {
  const base = slugify(model.replace(/^(Dyson|Sony)\s+/i, ""));
  const candidates = new Set([
    `${BASE}/en/${base}.html`,
    `${BASE}/en/dyson-${base}.html`,
    `${BASE}/en/sony-${base}.html`,
    `${BASE}/am/${base}.html`,
    `${BASE}/ru/${base}.html`,
  ]);

  const custom = {
    "Dyson Supersonic": ["dyson-supersonic-hair-dryer", "dyson-supersonic", "dyson-hair-dryer-supersonic"],
    "Dyson Supersonic Nural": ["dyson-supersonic-nural", "dyson-supersonic-nural-hair-dryer"],
    "Dyson Supersonic r": ["dyson-supersonic-r", "dyson-supersonic-r-hair-dryer"],
    "Dyson Supersonic Travel": ["dyson-supersonic-travel", "dyson-supersonic-travel-dryer"],
    "Sony PlayStation 5": ["sony-playstation-5-console", "playstation-5-console", "ps5-console"],
    "Sony PlayStation 5 Digital Edition": ["playstation-5-digital-edition", "ps5-digital-edition"],
    "Sony PlayStation 5 Slim": ["playstation-5-slim", "ps5-slim-console", "sony-ps5-slim-eu", "sony-ps5-slim"],
    "Sony PlayStation 5 Slim Digital Edition": [
      "playstation-5-slim-digital-edition",
      "ps5-slim-digital",
      "sony-ps5-slim-digital-edition-1tb",
      "sony-ps5-slim-digital-edition-fifa-26",
    ],
    "Sony PlayStation 5 Pro": ["playstation-5-pro", "ps5-pro-console", "sony-ps5-pro"],
    "Sony PlayStation 4": ["playstation-4-console", "ps4-console"],
    "Sony PlayStation 4 Slim": ["playstation-4-slim", "ps4-slim-console"],
    "Sony PlayStation 4 Pro": ["playstation-4-pro", "ps4-pro-console"],
  };

  if (custom[model]) {
    for (const slug of custom[model]) {
      candidates.add(`${BASE}/en/${slug}.html`);
      candidates.add(`${BASE}/am/${slug}.html`);
      candidates.add(`${BASE}/ru/${slug}.html`);
    }
  }

  return [...candidates];
}

function parseTitle(html) {
  return parseYmTitle(html);
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
      if (/logo|brand|placeholder|banner|magsafe|usb-c|lightning|adapter|power_adapter|orig_1|\/a\/i\/|\/b\/l\//i.test(url)) {
        continue;
      }
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
  let match;
  while ((match = re.exec(html))) {
    const url = match[0];
    if (/logo|brand|placeholder|banner|magsafe|usb-c|lightning|adapter|power_adapter|orig_1|\/a\/i\/|\/b\/l\//i.test(url)) {
      continue;
    }
    imgs.add(url);
  }
  return [...imgs].slice(0, 12);
}

function isRelevantDevice(title, url) {
  const text = `${title} ${url}`.toLowerCase();
  const dyson = /\bdyson\b/.test(text);
  const ps = /\b(playstation|ps4|ps5|sony)\b/.test(text);
  if (!dyson && !ps) return false;
  if (dyson && (isDysonHardRejected(title, title, url) || !isHairDryerProduct(title, title, url))) return false;
  if (ps) {
    if (isPlayStationHardRejected(title, title, url)) return false;
    if (isPlayStationGame(title, title, url)) return false;
    if (isPlayStationAccessoryProduct(title, title, url)) return false;
    if (!isPlayStationConsoleProduct(title, title, url)) return false;
  }
  return true;
}

function parseConfigurableVariants(html, baseTitle, url, targetModel, productType) {
  const variants = [];
  const gallery = parseImages(html);
  const imageUrl = gallery[0] || null;
  const mainPrice = parseMainProductPrice(html);

  const swatchBlock = extractProductInfoBlock(html);
  const swatches = [...swatchBlock.matchAll(/data-option-label="([^"]+)"[^>]*data-price-amount="(\d+)"/g)];

  if (swatches.length) {
    for (const [, label, priceStr] of swatches) {
      const swatchPrice = parseInt(priceStr, 10);
      const price = swatchPrice >= 50000 ? swatchPrice : mainPrice;
      if (!price || price <= 0) continue;
      const variantName = `${baseTitle} (${label})`;
      const options = extractVariantOptions(variantName, targetModel);
      if (/gb|tb/i.test(label)) options.storage = label;
      else if (!options.color) options.color = label;
      variants.push({ name: variantName, options, price });
    }
  }

  if (!variants.length && mainPrice) {
    variants.push({
      name: baseTitle,
      options: extractVariantOptions(baseTitle, targetModel),
      price: mainPrice,
    });
  }

  if (!variants.length) return [];

  return variants.map((variant, idx) => ({
    source: "yerevanmobile",
    source_name: "YerevanMobile",
    source_url: url,
    source_pid: `${url.split("/").pop()?.replace(".html", "")}-${idx}`,
    sku: `ym-${url.split("/").pop()?.replace(".html", "")}-${idx}`,
    name: variant.name,
    model: targetModel,
    normalized_model: targetModel,
    target_model: targetModel,
    product_type: productType,
    category: productType === "dyson" ? "Hair Dryers" : "Game Consoles",
    price: variant.price,
    currency: "AMD",
    stock_status: /out of stock|չկա/i.test(html) ? "out_of_stock" : "in_stock",
    description: "",
    descriptionHtml: null,
    specifications: "",
    options: Object.fromEntries(Object.entries(variant.options || {}).filter(([, val]) => val)),
    image_url: imageUrl,
    gallery,
    gallery_by_color: {},
    variant_source_type: swatches.length ? "configurable_options" : "main_product_price",
  }));
}

function extractProductInfoBlock(html) {
  const idx = html.indexOf('class="product-info-main"');
  if (idx >= 0) return html.slice(idx, idx + 60000);
  return html.slice(0, 120000);
}

async function parseProductPage(url, targets) {
  const { text, status } = await fetchHtml(url);
  if (status >= 400 || text.length < 1000) return null;
  const title = parseTitle(text);
  if (!title || !isRelevantDevice(title, url)) return null;
  const gallery = parseImages(text);
  if (!gallery.length) return null;

  const normalized = parentModelKey(title, title, url);
  const target = targets.find((row) => matchesTarget(row.model, title, url).ok);
  if (!target) return null;

  return parseConfigurableVariants(text, title, url, normalized, target.type);
}

async function searchCatalog(query) {
  const url = `${BASE}/en/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  const { text } = await fetchHtml(url, { sleepMs: 200 });
  return extractProductLinks(text);
}

function ymProductSlug(url) {
  return String(url || "")
    .split("/")
    .pop()
    ?.replace(/\.html$/i, "")
    .toLowerCase();
}

async function searchYerevanMobile(targets = DEVICE_TARGETS) {
  const variants = [];
  const rejected = [];
  const failed = [];
  const triedSlugs = new Set();
  const candidateUrls = new Set();

  for (const target of targets) {
    for (const query of buildSearchQueries(target)) {
      try {
        const searchLinks = await searchCatalog(query);
        searchLinks.forEach((url) => candidateUrls.add(url));
      } catch (error) {
        failed.push({ target: target.model, source: "yerevanmobile", query, error: error.message });
      }
      slugCandidatesForTarget(target.model).forEach((url) => candidateUrls.add(url));
    }
  }

  YEREVANMOBILE_KNOWN_PRODUCT_URLS.forEach((url) => candidateUrls.add(url));

  for (const catUrl of YEREVANMOBILE_CATEGORY_URLS) {
    try {
      const { text } = await fetchHtml(catUrl);
      extractProductLinks(text).forEach((url) => candidateUrls.add(url));
    } catch {
      console.warn(`[yerevanmobile] category failed: ${catUrl}`);
    }
  }

  for (const url of candidateUrls) {
    if (!url.includes("/en/")) continue;
    const slug = ymProductSlug(url);
    if (!slug || triedSlugs.has(slug)) continue;
    triedSlugs.add(slug);

    let items;
    try {
      items = await parseProductPage(url, targets);
    } catch (error) {
      failed.push({ source: "yerevanmobile", url, error: error.message });
      continue;
    }
    if (!items?.length) continue;

    const title = cleanText(items[0].name.replace(/\s*\([^)]+\)$/, ""));
    const normalized = parentModelKey(title, title, url);
    const target = targets.find((row) => normalize(row.model) === normalize(normalized));
    if (!target) {
      rejected.push({
        product: title,
        target: normalized,
        source: "yerevanmobile",
        url,
        reason: "not_in_allowlist",
      });
      continue;
    }

    const match = matchesTarget(target.model, title, url);
    if (!match.ok) {
      rejected.push({
        product: title,
        target: target.model,
        source: "yerevanmobile",
        url,
        reason: match.reason,
      });
      continue;
    }

    for (const item of items) {
      item.target_model = match.normalized;
      item.normalized_model = match.normalized;
      variants.push(item);
    }
  }

  console.log(`[yerevanmobile] ${variants.length} matched variants`);
  return { variants, rejected, failed };
}

module.exports = { searchYerevanMobile, parseProductPage, slugCandidatesForTarget };
