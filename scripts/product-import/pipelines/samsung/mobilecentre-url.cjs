"use strict";

const BASE_URL = "https://www.mobilecentre.am";

function normalizeProductPid(raw) {
  if (!raw) return null;
  const match = String(raw).match(/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Normalize manual MobileCentre candidate URLs before fetch.
 * - strips backslashes before underscores (\_ -> _)
 * - rejects URLs that still contain \_
 * - returns canonical pretty product URL without backslashes
 */
function normalizeManualCandidateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { ok: false, error: "empty_url" };
  }

  let url = rawUrl.trim().split("#")[0];
  if (!url) return { ok: false, error: "empty_url" };

  if (/\\_/.test(url)) {
    url = url.replace(/\\_/g, "_");
  }
  if (/\\_/.test(url)) {
    return { ok: false, error: "escaped_underscore_in_url" };
  }
  if (url.includes("\\")) {
    url = url.replace(/\\/g, "");
  }
  if (url.includes("\\")) {
    return { ok: false, error: "backslash_in_url" };
  }

  try {
    const parsed = new URL(url, BASE_URL);
    if (!parsed.hostname.includes("mobilecentre.am")) {
      return { ok: false, error: "not_mobilecentre_host" };
    }

    const pidFromQuery = normalizeProductPid(parsed.searchParams.get("pid"));
    const pathMatch = parsed.pathname.match(/\/product\/([^/]+)\/(\d+)\/?$/i);
    const slug = pathMatch ? pathMatch[1] : null;
    const pidFromPath = pathMatch ? normalizeProductPid(pathMatch[2]) : null;
    const pid = pidFromPath || pidFromQuery;

    if (!pid) {
      return { ok: false, error: "missing_product_pid" };
    }

    const cleanSlug = slug ? slug.replace(/\\/g, "") : null;
    const canonicalUrl = cleanSlug
      ? `${BASE_URL}/product/${cleanSlug}/${pid}/`
      : `${BASE_URL}/index.php?m=prod&pid=${pid}`;

    if (canonicalUrl.includes("\\")) {
      return { ok: false, error: "backslash_in_canonical_url" };
    }

    return { ok: true, canonicalUrl, pid, slug: cleanSlug };
  } catch {
    return { ok: false, error: "invalid_url" };
  }
}

/** Fetch URLs to try, preferring index.php then pretty slug URL. */
function buildMobileCentreFetchUrls(canonicalUrl) {
  const normalized = normalizeManualCandidateUrl(canonicalUrl);
  if (!normalized.ok) return [];

  const urls = [];
  const seen = new Set();
  const add = (value) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    urls.push(value);
  };

  add(`${BASE_URL}/index.php?m=prod&pid=${normalized.pid}`);
  add(normalized.canonicalUrl);

  return urls;
}

module.exports = {
  BASE_URL,
  normalizeManualCandidateUrl,
  buildMobileCentreFetchUrls,
  normalizeProductPid,
};
