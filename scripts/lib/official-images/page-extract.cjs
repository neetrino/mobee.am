"use strict";

const { isAllowedImageUrl, hostnameOf } = require("./domain.utils.cjs");
const { compactModel, normalizeModelKey } = require("./model.utils.cjs");
const { EXTRACTION_SOURCES } = require("./sources.constants.cjs");

const ALLOWED_SOURCES = new Set(EXTRACTION_SOURCES);

function decodeEscapes(raw) {
  return String(raw || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003[aA]/g, ":")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/");
}

function cleanUrl(raw, baseUrl = null) {
  if (!raw || typeof raw !== "string") return null;
  let u = decodeEscapes(raw).trim().replace(/[),.;]+$/g, "");
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    if (u.startsWith("/") && baseUrl) {
      u = new URL(u, baseUrl).toString();
    } else if (!/^https?:\/\//i.test(u)) {
      if (baseUrl && !u.includes("://")) {
        u = new URL(u, baseUrl).toString();
      } else {
        return null;
      }
    }
    const parsed = new URL(u);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function imageFingerprint(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.toLowerCase()}`;
  } catch {
    return url;
  }
}

function preferLargerVariant(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("images.samsung.com") && parsed.search.includes("$")) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    // LG CDN often appends ?w=800 thumbnail hints; prefer full asset path.
    if (
      /lg\.com$/i.test(parsed.hostname) &&
      /\/content\/dam\//i.test(parsed.pathname) &&
      parsed.searchParams.has("w")
    ) {
      parsed.search = "";
      return parsed.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

function pickLargestSrcset(srcset) {
  const parts = String(srcset || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let best = null;
  let bestScore = -1;
  for (const part of parts) {
    const bits = part.split(/\s+/);
    const url = bits[0];
    const desc = bits[1] || "";
    let score = 0;
    const w = desc.match(/^(\d+)w$/i);
    const x = desc.match(/^(\d+(?:\.\d+)?)x$/i);
    if (w) score = Number(w[1]);
    else if (x) score = Number(x[1]) * 1000;
    else score = 1;
    if (score >= bestScore) {
      bestScore = score;
      best = url;
    }
  }
  return best;
}

function modelTokens(model) {
  const key = normalizeModelKey(model);
  const compact = compactModel(model).toLowerCase();
  return [...new Set([key, compact, key.replace(/-/g, ""), compact.replace(/-/g, "")])].filter(
    Boolean
  );
}

function urlContainsModel(url, model) {
  const hay = String(url || "").toLowerCase();
  return modelTokens(model).some((token) => token.length >= 4 && hay.includes(token));
}

const REJECT_URL_PATTERNS = [
  /logo/i,
  /icon/i,
  /favicon/i,
  /sprite/i,
  /energy[-_]?label/i,
  /product-badge/i,
  /badge/i,
  /banner/i,
  /placeholder/i,
  /\.svg(\?|$)/i,
  /\.pdf(\?|$)/i,
  /thumb[-_]?/i,
  /\/thumb/i,
  /1x1/i,
  /spacer/i,
  /pixel/i,
  /clientlib/i,
  /gnb-/i,
  /\/gnb\//i,
  /menu_/i,
  /nav-/i,
  /bazaarvoice/i,
  /review/i,
  /avatar/i,
  /resized-images\/w\d+h\d+/i,
  /\/favicons?\//i,
  /bitrix\/cache/i,
];

function looksLikeProductImage(url) {
  const lower = url.toLowerCase();
  for (const re of REJECT_URL_PATTERNS) {
    if (re.test(lower)) return false;
  }
  if (/\/gallery\//i.test(url)) return true;
  if (/\/p6pim\//i.test(url)) return true;
  if (/\/content\/dam\//i.test(url)) return true;
  if (/\/is\/image\//i.test(url) && !/\/assets\//i.test(url)) return true;
  if (/media3\.(bosch-home|bsh-group)\.com/i.test(url)) return true;
  if (/Product_Shots/i.test(url)) return true;
  if (/\/upload\/iblock\//i.test(url) && !/resize_cache/i.test(url)) return true;
  if (/\/qr-product\//i.test(url)) return true;
  if (/\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(url)) return true;
  return false;
}

function mapExtractionSource(source, brandKey, pageUrl) {
  const s = String(source || "");
  if (/json-ld:Product\.image/i.test(s) || s === "JSON_LD_PRODUCT_IMAGE") {
    return "JSON_LD_PRODUCT_IMAGE";
  }
  if (/PRODUCT_GALLERY_JSON|gallery:json|embedded:(gallery|productImages|mediaContents)/i.test(s)) {
    return /embedded/i.test(s) ? "EMBEDDED_PRODUCT_STATE" : "PRODUCT_GALLERY_JSON";
  }
  if (/EMBEDDED_PRODUCT_STATE|embedded:/i.test(s)) return "EMBEDDED_PRODUCT_STATE";
  if (/PRODUCT_GALLERY_DOM|detail__img|gallery:src|MainContent_ProductImage/i.test(s)) {
    if (/qrcode\.hisense\.com/i.test(pageUrl || "") || /SUPPORT_PRODUCT_IMAGE/i.test(s)) {
      return "SUPPORT_PRODUCT_IMAGE";
    }
    return "PRODUCT_GALLERY_DOM";
  }
  if (/PRODUCT_SRCSET|gallery:srcset|srcset/i.test(s)) return "PRODUCT_SRCSET";
  if (/PRODUCT_OG_IMAGE|^og:image/i.test(s)) return "PRODUCT_OG_IMAGE";
  if (/SUPPORT_PRODUCT_IMAGE/i.test(s)) return "SUPPORT_PRODUCT_IMAGE";
  if (/HEADLESS_PRODUCT_GALLERY/i.test(s)) return "HEADLESS_PRODUCT_GALLERY";
  if (brandKey === "hisense" && /qrcode\.hisense\.com/i.test(pageUrl || "")) {
    return "SUPPORT_PRODUCT_IMAGE";
  }
  return null;
}

function scoreImageUrl(url, extractionSource, model) {
  let score = 0;
  if (extractionSource === "JSON_LD_PRODUCT_IMAGE") score += 50;
  if (extractionSource === "PRODUCT_GALLERY_DOM") score += 45;
  if (extractionSource === "PRODUCT_GALLERY_JSON") score += 42;
  if (extractionSource === "EMBEDDED_PRODUCT_STATE") score += 40;
  if (extractionSource === "SUPPORT_PRODUCT_IMAGE") score += 48;
  if (extractionSource === "HEADLESS_PRODUCT_GALLERY") score += 46;
  if (extractionSource === "PRODUCT_SRCSET") score += 30;
  if (extractionSource === "PRODUCT_OG_IMAGE") score += 8;
  if (/\/gallery\//i.test(url)) score += 25;
  if (/\/upload\/iblock\//i.test(url) && !/resize_cache/i.test(url)) score += 35;
  if (/resize_cache|resized-images/i.test(url)) score -= 20;
  if (/\/features\//i.test(url)) score -= 15;
  if (model && urlContainsModel(url, model)) score += 40;
  if (/lifestyle|banner|campaign/i.test(url)) score -= 20;
  return score;
}

function walkJsonLdNode(node, out, sourceHint) {
  if (node == null) return;
  if (typeof node === "string") {
    if (
      /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(node) ||
      /\/is\/image\//i.test(node) ||
      /\/content\/dam\//i.test(node) ||
      /\/upload\/iblock\//i.test(node) ||
      /media3\.(bosch-home|bsh-group)\.com/i.test(node)
    ) {
      out.push({
        url: node,
        source: sourceHint || "json-ld",
        jsonPath: sourceHint || "json-ld",
      });
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLdNode(item, out, sourceHint);
    return;
  }
  if (typeof node !== "object") return;

  const types = [].concat(node["@type"] || []).map((t) => String(t));
  const isProduct = types.some((t) => /Product/i.test(t));
  const isImageObject = types.some((t) => /ImageObject/i.test(t));

  if (isProduct && node.image != null) {
    walkJsonLdNode(node.image, out, "json-ld:Product.image");
  }
  if (isImageObject) {
    if (node.url) walkJsonLdNode(node.url, out, "json-ld:ImageObject");
    if (node.contentUrl) walkJsonLdNode(node.contentUrl, out, "json-ld:ImageObject");
  }
  if (node["@graph"]) walkJsonLdNode(node["@graph"], out, "json-ld:@graph");

  for (const [key, value] of Object.entries(node)) {
    if (key === "@type" || key === "@context") continue;
    if (/^(image|images|thumbnail|photo|gallery|mediaContents|productImages|productImage|picture|media)$/i.test(key)) {
      const src = isProduct ? `json-ld:Product.${key}` : `json:${key}`;
      walkJsonLdNode(value, out, src);
    } else if (typeof value === "object") {
      walkJsonLdNode(value, out, sourceHint);
    }
  }
}

function collectFromJsonLd(html) {
  const out = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = decodeEscapes(m[1].trim());
    if (!raw) continue;
    try {
      walkJsonLdNode(JSON.parse(raw), out, "json-ld");
    } catch {
      /* ignore */
    }
  }
  return out;
}

function collectOgImage(html) {
  const out = [];
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      out.push({ url: m[1], source: "og:image", jsonPath: "meta[og:image]" });
    }
  }
  return out;
}

function collectAttrUrls(tag, attrs, source) {
  const out = [];
  for (const attr of attrs) {
    const re = new RegExp(`${attr}=["']([^"']+)["']`, "i");
    const m = tag.match(re);
    if (!m) continue;
    if (attr.includes("srcset")) {
      const best = pickLargestSrcset(m[1]);
      if (best) out.push({ url: best, source: `${source}:srcset`, jsonPath: attr });
    } else {
      out.push({ url: m[1], source, jsonPath: attr });
    }
  }
  return out;
}

function collectHisenseRuGallery(html) {
  const out = [];
  const blockMatch = html.match(
    /<div[^>]*class="[^"]*detail__img-block[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*detail__(?:info|content|desc)/i
  );
  const block = blockMatch ? blockMatch[1] : null;
  if (!block) {
    // fallback: fancybox main-image attrs anywhere near detail wrap
    const fancy = /data-fancybox=["']main-image["'][^>]*data-src=["']([^"']+)["']/gi;
    let m;
    while ((m = fancy.exec(html)) !== null) {
      out.push({
        url: m[1],
        source: "PRODUCT_GALLERY_DOM:detail__img",
        jsonPath: "detail__img-item[data-fancybox=main-image]@data-src",
        galleryComponentId: "detail__img-block",
      });
    }
    return out;
  }

  const fancy = /data-fancybox=["']main-image["'][^>]*data-src=["']([^"']+)["']/gi;
  let m;
  while ((m = fancy.exec(block)) !== null) {
    out.push({
      url: m[1],
      source: "PRODUCT_GALLERY_DOM:detail__img",
      jsonPath: "detail__img-item[data-fancybox=main-image]@data-src",
      galleryComponentId: "detail__img-block",
    });
  }

  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(block)) !== null) {
    const best = pickLargestSrcset(m[1]);
    if (best && !/resize_cache\/iblock\/[^/]+\/\d+_\d+/i.test(best)) {
      out.push({
        url: best,
        source: "PRODUCT_SRCSET:detail__img",
        jsonPath: "detail__img-block source@srcset",
        galleryComponentId: "detail__img-block",
      });
    }
  }
  return out;
}

function collectHisenseSupportImages(html) {
  const out = [];
  const productImg =
    /<div[^>]*id=["']MainContent_ProductImageContainer["'][^>]*>([\s\S]*?)<\/div>/i.exec(
      html
    );
  if (productImg) {
    const tags = productImg[1].match(/<(?:img|source)[^>]*>/gi) || [];
    for (const tag of tags) {
      out.push(
        ...collectAttrUrls(
          tag,
          ["src", "data-src", "data-original", "srcset"],
          "SUPPORT_PRODUCT_IMAGE:MainContent_ProductImage"
        ).map((x) => ({
          ...x,
          galleryComponentId: "MainContent_ProductImageContainer",
        }))
      );
    }
  }
  const imgId = /id=["']MainContent_ProductImage["'][^>]*>/i.exec(html);
  if (imgId) {
    out.push(
      ...collectAttrUrls(
        imgId[0],
        ["src", "data-src"],
        "SUPPORT_PRODUCT_IMAGE:MainContent_ProductImage"
      ).map((x) => ({
        ...x,
        galleryComponentId: "MainContent_ProductImage",
      }))
    );
  }
  return out;
}

function collectLgGallery(html, model) {
  const out = [];
  const modelCompact = compactModel(model).toLowerCase();

  // Absolute + relative content/dam URLs that mention model and/or /gallery/
  const damRe =
    /(?:https?:\/\/(?:www\.)?lg\.com)?(\/content\/dam\/[^"'\\\s<>]+)/gi;
  let m;
  while ((m = damRe.exec(html)) !== null) {
    const path = decodeEscapes(m[1]);
    const lower = path.toLowerCase();
    const inGallery = /\/gallery\//i.test(lower);
    const hasModel = modelCompact && lower.includes(modelCompact.toLowerCase());
    if (!inGallery && !hasModel) continue;
    if (/\/features\//i.test(lower) && !inGallery) continue;
    if (/\/450\.jpe?g/i.test(lower) && !inGallery) {
      // small card image — keep only as weak candidate via og later
      continue;
    }
    out.push({
      url: path,
      source: inGallery
        ? "PRODUCT_GALLERY_DOM:content-dam-gallery"
        : "PRODUCT_GALLERY_DOM:content-dam-model",
      jsonPath: "html:/content/dam",
      galleryComponentId: inGallery ? "content-dam-gallery" : null,
    });
  }

  const tagRe = /<(?:img|source|picture)[^>]*>/gi;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/content\/dam/i.test(tag)) continue;
    const attrs = collectAttrUrls(
      tag,
      [
        "src",
        "data-src",
        "data-original",
        "data-image",
        "data-zoom-image",
        "data-desktop-src",
        "data-mobile-src",
        "srcset",
        "data-srcset",
      ],
      "PRODUCT_GALLERY_DOM:lg-tag"
    );
    for (const item of attrs) {
      const lower = String(item.url || "").toLowerCase();
      if (!/content\/dam/i.test(lower)) continue;
      const inGallery = /\/gallery\//i.test(lower);
      const hasModel = modelCompact && lower.includes(modelCompact.toLowerCase());
      if (!inGallery && !hasModel) continue;
      out.push({
        ...item,
        galleryComponentId: inGallery ? "lg-gallery" : null,
      });
    }
  }
  return out;
}

function collectGenericGalleryDom(html) {
  const out = [];
  const tagRe = /<(?:img|source)[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    out.push(
      ...collectAttrUrls(
        m[0],
        [
          "src",
          "data-src",
          "data-original",
          "data-image",
          "data-zoom-image",
          "srcset",
          "data-srcset",
        ],
        "gallery:src"
      )
    );
  }
  return out;
}

const EMBEDDED_IMAGE_KEYS =
  /^(gallery|productImages|mediaContents|desktopUrl|mobileUrl|imageUrl|lazyLoadUrl|image|images|thumbnailUrl|contentUrl|productImage|picture|media|src|url)$/i;

function walkEmbeddedState(node, out, sourceHint, path = "$") {
  if (node == null) return;
  if (typeof node === "string") {
    if (
      /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(node) ||
      /\/is\/image\//i.test(node) ||
      /\/content\/dam\//i.test(node) ||
      /\/upload\/iblock\//i.test(node) ||
      /media3\.(bosch-home|bsh-group)\.com/i.test(node) ||
      /cdn\.hisense\.ru\/upload/i.test(node)
    ) {
      out.push({
        url: node,
        source: sourceHint || "embedded",
        jsonPath: path,
      });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkEmbeddedState(item, out, sourceHint, `${path}[${i}]`));
    return;
  }
  if (typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const next = `${path}.${key}`;
    if (EMBEDDED_IMAGE_KEYS.test(key)) {
      walkEmbeddedState(value, out, `embedded:${key}`, next);
    } else if (typeof value === "object") {
      walkEmbeddedState(value, out, sourceHint, next);
    }
  }
}

function collectEmbeddedState(html) {
  const out = [];
  const scriptRe =
    /<script[^>]*(?:id=["']__NEXT_DATA__["']|type=["']application\/json["']|type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      walkEmbeddedState(JSON.parse(decodeEscapes(m[1])), out, "embedded");
    } catch {
      /* ignore */
    }
  }
  // Escaped JSON URLs in AEM / LG payloads
  const escapedDam =
    /https?:\\\/\\\/(?:www\.)?lg\.com\\\/content\\\/dam\\\/[^"'\\]+/gi;
  while ((m = escapedDam.exec(html)) !== null) {
    out.push({
      url: decodeEscapes(m[0]),
      source: "EMBEDDED_PRODUCT_STATE:escaped",
      jsonPath: "html:escaped-dam",
    });
  }
  return out;
}

function collectSamsungBoschBroad(html, brandKey) {
  const out = [];
  if (brandKey !== "samsung" && brandKey !== "bosch") return out;
  const re = /https?:\/\/[^"'\\\s<>]+/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[0];
    if (
      /\/is\/image\//i.test(url) ||
      /media3\.bosch-home\.com/i.test(url) ||
      /media3\.bsh-group\.com/i.test(url) ||
      (brandKey === "samsung" && /images\.samsung\.com/i.test(url))
    ) {
      out.push({ url, source: "embedded", jsonPath: "html:broad" });
    }
  }
  return out;
}

function mideaProvenance(url, extractionSource, model) {
  const lower = String(url || "").toLowerCase();
  if (/homepage|banner|campaign|heater|logo|icon|\/plp\//i.test(lower)) {
    return { ok: false, reason: "REJECT_UNRELATED_OFFICIAL_ASSET" };
  }
  if (urlContainsModel(url, model)) return { ok: true, modelEvidence: "MODEL_IN_URL" };
  if (extractionSource === "JSON_LD_PRODUCT_IMAGE") {
    return { ok: true, modelEvidence: "JSON_LD_PRODUCT_IMAGE" };
  }
  if (
    extractionSource === "PRODUCT_GALLERY_JSON" ||
    extractionSource === "EMBEDDED_PRODUCT_STATE"
  ) {
    return { ok: true, modelEvidence: "PRODUCT_GALLERY" };
  }
  return { ok: false, reason: "REJECT_UNRELATED_OFFICIAL_ASSET" };
}

function boschExactHostAllowed(item, matchStatus, pageUrl) {
  if (hostnameOf(item.url) !== "media3.bsh-group.com") return true;
  if (!/EXACT|NORMALIZED|CORRECTED|APPROVED/i.test(String(matchStatus || ""))) {
    return false;
  }
  if (!/bosch-home\.com/i.test(pageUrl || "")) return false;
  if (!/Product_Shots|\/Images\//i.test(item.url)) return false;
  return true;
}

/**
 * @param {string} html
 * @param {string} brandKey
 * @param {string} pageUrl
 * @param {{ model: string, matchStatus?: string, matchType?: string, extraCandidates?: object[] }} ctx
 */
function extractOfficialImages(html, brandKey, pageUrl, ctx = {}) {
  const model = ctx.model || "";
  const matchStatus = ctx.matchStatus || "";
  const matchType = ctx.matchType || matchStatus;

  const raw = [];
  if (brandKey === "hisense" && /ru\.hisense\.com/i.test(pageUrl)) {
    raw.push(...collectHisenseRuGallery(html));
    raw.push(...collectFromJsonLd(html));
    raw.push(...collectEmbeddedState(html));
    raw.push(...collectOgImage(html));
  } else if (brandKey === "hisense" && /qrcode\.hisense\.com/i.test(pageUrl)) {
    raw.push(...collectHisenseSupportImages(html));
    raw.push(...collectFromJsonLd(html));
    raw.push(...collectEmbeddedState(html));
    raw.push(...collectOgImage(html));
  } else if (brandKey === "lg") {
    raw.push(...collectFromJsonLd(html));
    raw.push(...collectLgGallery(html, model));
    raw.push(...collectEmbeddedState(html));
    raw.push(...collectOgImage(html));
  } else {
    raw.push(...collectFromJsonLd(html));
    raw.push(...collectGenericGalleryDom(html));
    raw.push(...collectEmbeddedState(html));
    raw.push(...collectSamsungBoschBroad(html, brandKey));
    raw.push(...collectOgImage(html));
  }

  if (Array.isArray(ctx.extraCandidates)) {
    raw.push(...ctx.extraCandidates);
  }

  const cdnCandidates = [];
  const rejected = [];
  const accepted = [];
  const seenFp = new Set();

  for (const item of raw) {
    const cleaned = cleanUrl(item.url, pageUrl);
    if (!cleaned) continue;
    const preferred = preferLargerVariant(cleaned);
    const check = isAllowedImageUrl(preferred, brandKey, {
      pageUrl,
      matchType,
      matchStatus,
    });

    if (!check.allowed) {
      if (check.reason === "CDN_CANDIDATE") {
        const extractionSource =
          mapExtractionSource(item.source, brandKey, pageUrl) || item.source;
        cdnCandidates.push({
          hostname: check.hostname,
          brand: brandKey,
          productPage: pageUrl,
          model,
          exactMatch: /EXACT|APPROVED|SUPPORT/i.test(String(matchType || "")),
          extractionSource,
          sampleImageUrl: preferred,
        });
      } else if (check.reason === "BLOCKED_HOST") {
        rejected.push({
          url: preferred,
          reason: "BLOCKED_HOST",
          source: item.source,
          hostname: check.hostname,
        });
      }
      continue;
    }

    if (!looksLikeProductImage(preferred)) {
      rejected.push({
        url: preferred,
        reason: "REJECT_NON_PRODUCT_ASSET",
        source: item.source,
      });
      continue;
    }

    if (!boschExactHostAllowed({ url: preferred, source: item.source }, matchStatus, pageUrl)) {
      rejected.push({
        url: preferred,
        reason: "BSH_HOST_REQUIRES_EXACT_MATCH_PAGE",
        source: item.source,
      });
      continue;
    }

    const extractionSource = mapExtractionSource(item.source, brandKey, pageUrl);
    if (!extractionSource || !ALLOWED_SOURCES.has(extractionSource)) {
      rejected.push({
        url: preferred,
        reason: "REJECT_UNPROVEN_SOURCE",
        source: item.source,
      });
      continue;
    }

    // Hisense RU: only accept CDN images from gallery / json-ld / og fallback
    if (hostnameOf(preferred) === "cdn.hisense.ru") {
      const okSource =
        extractionSource === "PRODUCT_GALLERY_DOM" ||
        extractionSource === "PRODUCT_SRCSET" ||
        extractionSource === "JSON_LD_PRODUCT_IMAGE" ||
        extractionSource === "PRODUCT_GALLERY_JSON" ||
        extractionSource === "EMBEDDED_PRODUCT_STATE" ||
        extractionSource === "PRODUCT_OG_IMAGE" ||
        extractionSource === "HEADLESS_PRODUCT_GALLERY";
      if (!okSource || !/ru\.hisense\.com/i.test(pageUrl)) {
        rejected.push({
          url: preferred,
          reason: "REJECT_CDN_WITHOUT_GALLERY_PROOF",
          source: item.source,
        });
        continue;
      }
      if (/\/upload\/(?!iblock|webp\/upload\/iblock)/i.test(preferred) && /favicon|templates|bitrix/i.test(preferred)) {
        rejected.push({ url: preferred, reason: "REJECT_NON_PRODUCT_ASSET", source: item.source });
        continue;
      }
    }

    let modelEvidence = null;
    if (brandKey === "midea") {
      const provenance = mideaProvenance(preferred, extractionSource, model);
      if (!provenance.ok) {
        rejected.push({
          url: preferred,
          reason: provenance.reason,
          source: item.source,
          action: "REJECT_UNRELATED_OFFICIAL_ASSET",
        });
        continue;
      }
      modelEvidence = provenance.modelEvidence;
    } else if (urlContainsModel(preferred, model)) {
      modelEvidence = "MODEL_IN_URL";
    } else if (
      extractionSource === "JSON_LD_PRODUCT_IMAGE" ||
      extractionSource === "PRODUCT_GALLERY_DOM" ||
      extractionSource === "SUPPORT_PRODUCT_IMAGE" ||
      extractionSource === "PRODUCT_GALLERY_JSON" ||
      extractionSource === "EMBEDDED_PRODUCT_STATE" ||
      extractionSource === "HEADLESS_PRODUCT_GALLERY"
    ) {
      modelEvidence = `STRUCTURE:${extractionSource}`;
    } else if (extractionSource === "PRODUCT_OG_IMAGE" && model) {
      modelEvidence = "OG_FALLBACK";
    } else {
      rejected.push({
        url: preferred,
        reason: "REJECT_NO_MODEL_LINKAGE",
        source: item.source,
      });
      continue;
    }

    // LG: features banners without gallery proof
    if (brandKey === "lg" && /\/features\//i.test(preferred) && !/\/gallery\//i.test(preferred)) {
      if (extractionSource !== "JSON_LD_PRODUCT_IMAGE") {
        rejected.push({
          url: preferred,
          reason: "REJECT_FEATURE_BANNER",
          source: item.source,
        });
        continue;
      }
    }

    const fp = imageFingerprint(preferred);
    if (seenFp.has(fp)) continue;
    seenFp.add(fp);

    accepted.push({
      url: preferred,
      source: item.source,
      extractionSource,
      hostname: hostnameOf(preferred),
      score: scoreImageUrl(preferred, extractionSource, model),
      evidence: {
        extractionSource,
        domSelectorOrJsonPath: item.jsonPath || item.source || null,
        productGalleryComponentId: item.galleryComponentId || null,
        modelEvidence,
        pageUrl,
        hostname: hostnameOf(preferred),
      },
    });
  }

  accepted.sort((a, b) => b.score - a.score);
  const limited = accepted.slice(0, 10);

  return {
    images: limited,
    totalFound: accepted.length,
    cdnCandidates,
    rejected,
  };
}

module.exports = {
  extractOfficialImages,
  cleanUrl,
  decodeEscapes,
  imageFingerprint,
  looksLikeProductImage,
  urlContainsModel,
  modelTokens,
  pickLargestSrcset,
  mapExtractionSource,
  collectHisenseRuGallery,
  collectHisenseSupportImages,
  collectLgGallery,
};
