"use strict";

const { isAllowedPageUrl } = require("./domain.utils.cjs");
const { fetchHtml } = require("./http.utils.cjs");
const {
  compactModel,
  matchModelOnPage,
} = require("./model.utils.cjs");
const { APPROVED_MATCH_TYPES } = require("./sources.constants.cjs");

/**
 * Find approved override entry by extracted model (exact / case / compact key).
 * @param {object} overrides
 * @param {string} brandKey
 * @param {string} model
 */
function findOverrideEntry(overrides, brandKey, model) {
  const brandMap = overrides?.[brandKey];
  if (!brandMap || typeof brandMap !== "object") return null;
  const direct =
    brandMap[model] ||
    brandMap[String(model).toUpperCase()] ||
    brandMap[String(model).toLowerCase()];
  if (direct) return direct;

  const compact = compactModel(model);
  for (const [key, entry] of Object.entries(brandMap)) {
    if (compactModel(key) === compact) return entry;
    if (entry?.normalizedModel && compactModel(entry.normalizedModel) === compact) {
      return entry;
    }
    if (entry?.marcoModel && compactModel(entry.marcoModel) === compact) {
      return entry;
    }
  }
  return null;
}

/**
 * Prefer longest override key / marcoModel that appears in the product title.
 * Disambiguates slash-suffix twins (e.g. MF100W60/T vs MF100W60/D).
 * Prefer key/marcoModel hits over normalizedModel-only (regional analog) hits.
 */
function findOverrideEntryForTitle(overrides, brandKey, title, extractedModel) {
  const brandMap = overrides?.[brandKey];
  if (!brandMap || typeof brandMap !== "object") return null;

  const titleCompact = compactModel(title);
  let best = null;
  let bestLen = 0;
  let bestPriority = -1; // 2=key/marco in title, 1=normalized only

  for (const [key, entry] of Object.entries(brandMap)) {
    if (!entry?.approved) continue;

    const keyCompact = compactModel(key);
    const marcoCompact = compactModel(entry.marcoModel || "");
    const normCompact = compactModel(entry.normalizedModel || "");

    let priority = -1;
    let len = 0;
    if (keyCompact.length >= 4 && titleCompact.includes(keyCompact)) {
      priority = 2;
      len = keyCompact.length;
    }
    if (marcoCompact.length >= 4 && titleCompact.includes(marcoCompact)) {
      if (priority < 2 || marcoCompact.length > len) {
        priority = 2;
        len = Math.max(len, marcoCompact.length);
      }
    }
    if (
      priority < 0 &&
      normCompact.length >= 4 &&
      titleCompact.includes(normCompact)
    ) {
      priority = 1;
      len = normCompact.length;
    }

    if (
      priority > bestPriority ||
      (priority === bestPriority && len > bestLen)
    ) {
      best = entry;
      bestPriority = priority;
      bestLen = len;
    }
  }
  if (best) return best;
  if (extractedModel) return findOverrideEntry(overrides, brandKey, extractedModel);
  return null;
}

const SAMSUNG_LOCALES = [
  "kz_ru",
  "kz_kz",
  "ua",
  "az",
  "ru",
  "uk",
  "ae",
  "sa",
  "eg",
  "de",
  "pl",
  "tr",
  "in",
  "sg",
  "au",
  "gb",
  "us",
  "ca",
];

const LG_LOCALES = ["us", "uk", "ae", "eg_en", "in", "de", "pl", "sa"];

function scoreCandidateUrl(url, model) {
  const compact = compactModel(model);
  const u = compactModel(url);
  let score = 0;
  if (u.includes(compact)) score += 100;
  const m = compact.match(/^(.+\d)([A-Z]{2,5})$/);
  if (m && u.includes(m[1])) score += 40;
  if (/\/support\/model\//i.test(url)) score -= 10;
  if (/\/c\/p\//i.test(url)) score += 25;
  if (/\/search/i.test(url)) score -= 40;
  if (/\/tvs\/|\/washing|\/washer|\/refrigerat|\/air-condition|\/home-appliances\//i.test(url)) {
    score += 15;
  }
  return score;
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractLinksContainingModel(html, baseUrl, model) {
  const compact = compactModel(model);
  const baseMatch = compact.match(/^(.+\d)([A-Z]{2,5})$/);
  const bases = baseMatch ? [compact, baseMatch[1]] : [compact];
  const out = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const abs = absoluteUrl(m[1], baseUrl);
    if (!abs) continue;
    const c = compactModel(abs);
    if (bases.some((b) => b.length >= 5 && c.includes(b))) out.push(abs);
  }
  return [...new Set(out)];
}

/**
 * Pull product URLs from embedded JSON (Next.js / Coveo / etc.).
 */
function extractUrlsFromEmbeddedJson(html, model) {
  const out = [];
  const compact = compactModel(model);
  const scripts = [];
  const re =
    /<script[^>]*(?:id=["']__NEXT_DATA__["']|type=["']application\/json["']|type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) scripts.push(m[1]);

  for (const raw of scripts) {
    let text = raw;
    try {
      text = JSON.stringify(JSON.parse(raw));
    } catch {
      /* keep raw */
    }
    const ure =
      /https?:\\\/\\\/[^"\\]+|https?:\/\/[^"\\s]+|\/[a-z]{2}(?:_[a-z]{2})?\/[^"\\s]+/gi;
    while ((m = ure.exec(text)) !== null) {
      let url = m[0].replace(/\\\//g, "/");
      if (url.startsWith("/")) {
        // relative — skip without base
        continue;
      }
      if (compactModel(url).includes(compact) || /\/content\/dam\//i.test(url)) {
        out.push(url);
      }
    }
    // Coveo clickUri style without protocol escaping
    const clickRe = /"(?:clickUri|uri|url|productUrl|pdpUrl)"\s*:\s*"([^"]+)"/gi;
    while ((m = clickRe.exec(text)) !== null) {
      out.push(m[1].replace(/\\\//g, "/"));
    }
  }
  return [...new Set(out)];
}

function buildPriorityCandidates(brandKey, model) {
  const encoded = encodeURIComponent(model);
  const lower = String(model).toLowerCase();
  const list = [];

  if (brandKey === "samsung") {
    const { modelLookupVariants } = require("./model.utils.cjs");
    const variants = modelLookupVariants(model);
    for (const variant of variants) {
      for (const locale of SAMSUNG_LOCALES) {
        list.push({
          url: `https://www.samsung.com/${locale}/c/p/${variant}/`,
          via: "samsung-cp",
          priority: 1,
        });
      }
    }
    for (const locale of SAMSUNG_LOCALES.slice(0, 8)) {
      list.push({
        url: `https://www.samsung.com/${locale}/support/model/${model}/`,
        via: "samsung-support",
        priority: 2,
      });
    }
  }

  if (brandKey === "lg") {
    const locales = ["kz", "ru", "ua", "uz_ru", "ae", "eg_en", "uk", "us", "de", "pl", "sa"];
    for (const locale of locales) {
      list.push({
        url: `https://www.lg.com/${locale}/laundry/washing-machines/${lower}/`,
        via: "lg-pdp",
        priority: 1,
      });
      list.push({
        url: `https://www.lg.com/${locale}/washing-machines/${lower}`,
        via: "lg-pdp",
        priority: 1,
      });
      list.push({
        url: `https://www.lg.com/${locale}/washing-machines/lg-${lower}`,
        via: "lg-pdp",
        priority: 1,
      });
      list.push({
        url: `https://www.lg.com/${locale}/search?search=${encoded}`,
        via: "lg-search",
        priority: 3,
      });
    }
  }

  if (brandKey === "bosch") {
    const { modelLookupVariants } = require("./model.utils.cjs");
    const variants = modelLookupVariants(model);
    for (const variant of variants) {
      for (const localePair of [
        "de/de",
        "gb/en",
        "us/en",
        "it/it",
        "nl/nl",
        "pl/pl",
        "tr/tr",
        "ua/uk",
        "fr/fr",
        "eg/en",
      ]) {
        list.push({
          url: `https://www.bosch-home.com/${localePair}/product/${variant}`,
          via: "bosch-product",
          priority: 1,
        });
      }
      list.push({
        url: `https://www.bosch-home.com/de/de/product/${variant}`,
        via: "bosch-product",
        priority: 1,
      });
    }
  }

  if (brandKey === "hisense") {
    list.push({
      url: `https://global.hisense.com/search?q=${encoded}`,
      via: "hisense-search",
      priority: 1,
    });
    list.push({
      url: `https://www.hisense.com/us/search?q=${encoded}`,
      via: "hisense-search",
      priority: 1,
    });
  }

  if (brandKey === "midea") {
    const slug = lower;
    for (const locale of ["ge-en", "us", "global", "ae-en", "ru"]) {
      list.push({
        url: `https://www.midea.com/${locale}/air-conditioners/inverter-conditioner/conditioner-${slug}-forest.${slug}`,
        via: "midea-pdp",
        priority: 1,
      });
      list.push({
        url: `https://www.midea.com/${locale}/air-conditioners/${slug}`,
        via: "midea-path",
        priority: 2,
      });
    }
    list.push({
      url: `https://www.midea.com/us/search?q=${encoded}`,
      via: "midea-search",
      priority: 3,
    });
  }

  return list.sort((a, b) => a.priority - b.priority);
}

async function evaluatePage(url, model, via) {
  const page = await fetchHtml(url);
  if (page.statusCode !== 200) {
    return {
      url,
      via,
      status: page.statusCode,
      match: "FETCH_FAILED",
      html: null,
    };
  }
  const match = matchModelOnPage(model, url, page.html);
  return {
    url,
    via,
    status: page.statusCode,
    match,
    score: scoreCandidateUrl(url, model),
    html: page.html,
  };
}

async function collectLinkedProductPages(brandKey, model, fromUrl, html) {
  const links = [
    ...extractLinksContainingModel(html, fromUrl, model),
    ...extractUrlsFromEmbeddedJson(html, model),
  ];
  const out = [];
  for (const link of links) {
    let abs = link;
    if (link.startsWith("/")) abs = absoluteUrl(link, fromUrl);
    if (!abs || !isAllowedPageUrl(abs, brandKey)) continue;
    if (/\/search/i.test(abs)) continue;
    out.push(abs);
  }
  return [...new Set(out)];
}

/**
 * Resolve official product page from approved overrides only.
 * Automatic page discovery is disabled — use manual-approved list.
 *
 * @param {string} brandKey
 * @param {string} model
 * @param {object|null} _cacheEntry unused (kept for call-site compat)
 * @param {object} overrides manual page overrides by brand/model
 */
async function resolveOfficialProductPage(
  brandKey,
  model,
  _cacheEntry,
  overrides = {},
  preloadedOverrideEntry = null
) {
  const overrideEntry =
    preloadedOverrideEntry || findOverrideEntry(overrides, brandKey, model);

  if (!overrideEntry?.approved || !overrideEntry?.pageUrl) {
    return {
      officialPage: null,
      matchStatus: "NO_APPROVED_PAGE",
      fromCache: false,
      fromOverride: Boolean(overrideEntry),
      candidates: [],
      reason: "NO_APPROVED_PAGE",
      html: null,
      overrideEntry: overrideEntry || null,
    };
  }

  const matchType = String(overrideEntry.matchType || "EXACT");
  if (!APPROVED_MATCH_TYPES.includes(matchType)) {
    return {
      officialPage: null,
      matchStatus: "NO_APPROVED_PAGE",
      fromCache: false,
      fromOverride: true,
      candidates: [],
      reason: `UNSUPPORTED_MATCH_TYPE:${matchType}`,
      html: null,
      overrideEntry,
    };
  }

  if (!isAllowedPageUrl(overrideEntry.pageUrl, brandKey, overrideEntry)) {
    return {
      officialPage: null,
      matchStatus: "NOT_FOUND",
      fromCache: false,
      fromOverride: true,
      candidates: [],
      reason: "OVERRIDE_DOMAIN_NOT_ALLOWED",
      html: null,
      overrideEntry,
    };
  }

  const modelToConfirm =
    overrideEntry.normalizedModel || overrideEntry.marcoModel || model;

  const allowApprovedModelMismatch =
    matchType === "EXACT_CORRECTED_MODEL" ||
    matchType === "APPROVED_REGIONAL_ANALOG" ||
    Boolean(
      overrideEntry.approvalStatus &&
        /^REVIEW_/i.test(String(overrideEntry.approvalStatus))
    );

  try {
    const page = await evaluatePage(
      overrideEntry.pageUrl,
      modelToConfirm,
      "manual-override"
    );
    if (page.status !== 200) {
      return {
        officialPage: null,
        matchStatus: "NOT_FOUND",
        fromCache: false,
        fromOverride: true,
        candidates: [
          {
            url: overrideEntry.pageUrl,
            status: page.status,
            match: page.match,
            via: "manual-override",
            matchType,
          },
        ],
        reason: `OVERRIDE_HTTP_${page.status}`,
        html: null,
        overrideEntry,
      };
    }

    const modelOk =
      page.match === "EXACT_MODEL_MATCH" ||
      page.match === "NORMALIZED_MODEL_MATCH";

    if (!modelOk && !allowApprovedModelMismatch) {
      return {
        officialPage: overrideEntry.pageUrl,
        matchStatus: "MODEL_MISMATCH",
        fromCache: false,
        fromOverride: true,
        candidates: [
          {
            url: overrideEntry.pageUrl,
            status: page.status,
            match: page.match,
            via: "manual-override",
            matchType,
          },
        ],
        reason: "MODEL_MISMATCH",
        html: page.html,
        overrideEntry,
        matchType,
        overrideNormalizedModel: modelToConfirm,
      };
    }

    return {
      officialPage: overrideEntry.pageUrl,
      matchStatus: matchType,
      pageModelMatch: modelOk
        ? page.match
        : "APPROVED_OVERRIDE_MODEL_MISMATCH_ALLOWED",
      fromCache: false,
      fromOverride: true,
      candidates: [
        {
          url: overrideEntry.pageUrl,
          status: 200,
          match: page.match,
          via: "manual-override",
          matchType,
        },
      ],
      reason: modelOk ? null : "APPROVED_MODEL_MISMATCH_ALLOWED",
      html: page.html,
      overrideEntry,
      matchType,
      overrideNormalizedModel: modelToConfirm,
    };
  } catch (err) {
    return {
      officialPage: null,
      matchStatus: "NOT_FOUND",
      fromCache: false,
      fromOverride: true,
      candidates: [],
      reason: `OVERRIDE_FETCH_FAILED:${err.message}`,
      html: null,
      overrideEntry,
    };
  }
}

module.exports = {
  resolveOfficialProductPage,
  findOverrideEntry,
  findOverrideEntryForTitle,
  scoreCandidateUrl,
  buildPriorityCandidates,
  extractUrlsFromEmbeddedJson,
};
