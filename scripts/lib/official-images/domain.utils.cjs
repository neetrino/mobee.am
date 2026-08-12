"use strict";

const {
  OFFICIAL_SOURCES,
  BLOCKED_IMAGE_HOSTS,
} = require("./sources.constants.cjs");

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

/**
 * True if hostname is exactly base or a subdomain of base (not brand-in-name spoof).
 */
function hostMatchesBase(hostname, baseDomain) {
  const host = String(hostname || "").toLowerCase();
  const base = String(baseDomain || "").toLowerCase();
  if (!host || !base) return false;
  return host === base || host.endsWith(`.${base}`);
}

function isBlockedImageHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return BLOCKED_IMAGE_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`)
  );
}

/**
 * Compare approved override URL to candidate (host + path; query if present on approved).
 */
function urlsMatchApproved(candidateUrl, approvedUrl) {
  try {
    const a = new URL(approvedUrl);
    const b = new URL(candidateUrl);
    if (a.hostname.toLowerCase() !== b.hostname.toLowerCase()) return false;
    const pathA = a.pathname.replace(/\/+$/, "") || "/";
    const pathB = b.pathname.replace(/\/+$/, "") || "/";
    if (pathA !== pathB) return false;
    if (a.search) return a.search === b.search;
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @param {string} brandKey
 * @param {object|null} [overrideEntry]
 */
function isAllowedPageUrl(url, brandKey, overrideEntry = null) {
  const cfg = OFFICIAL_SOURCES[brandKey];
  if (!cfg) return false;
  const host = hostnameOf(url);

  if (
    overrideEntry?.approved &&
    overrideEntry.pageUrl &&
    urlsMatchApproved(url, overrideEntry.pageUrl)
  ) {
    return true;
  }

  if (
    Array.isArray(cfg.exactPageHostsOnly) &&
    cfg.exactPageHostsOnly.includes(host)
  ) {
    return false;
  }

  if (Array.isArray(cfg.exactPageHosts) && cfg.exactPageHosts.includes(host)) {
    return true;
  }

  return cfg.pageDomains.some((d) => hostMatchesBase(host, d));
}

function gatedHostAllows(host, brandKey, ctx = {}) {
  const cfg = OFFICIAL_SOURCES[brandKey];
  const gate = cfg?.gatedExactImageHosts?.[host];
  if (!gate) return { allowed: false, reason: "NOT_GATED_HOST" };

  const pageHost = hostnameOf(ctx.pageUrl || "");
  if (gate.requirePageHostSuffix) {
    const suffix = String(gate.requirePageHostSuffix).toLowerCase();
    if (!(pageHost === suffix || pageHost.endsWith(`.${suffix}`))) {
      return { allowed: false, reason: "CDN_CANDIDATE", hostname: host };
    }
  }

  if (Array.isArray(gate.requireMatchTypes) && gate.requireMatchTypes.length) {
    const matchType = String(ctx.matchType || ctx.matchStatus || "");
    if (!gate.requireMatchTypes.includes(matchType)) {
      return { allowed: false, reason: "CDN_CANDIDATE", hostname: host };
    }
  }

  if (Array.isArray(gate.pathIncludesAny) && gate.pathIncludesAny.length) {
    const path = pathnameOf(ctx.imageUrl || "");
    if (!gate.pathIncludesAny.some((p) => path.includes(p))) {
      return { allowed: false, reason: "CDN_CANDIDATE", hostname: host };
    }
  }

  return { allowed: true, viaExactHost: true, gated: true };
}

/**
 * @param {string} url
 * @param {string} brandKey
 * @param {{ pageUrl?: string, matchType?: string, matchStatus?: string }} [ctx]
 * @returns {{ allowed: boolean, reason?: string, hostname?: string, path?: string, viaExactHost?: boolean, gated?: boolean }}
 */
function isAllowedImageUrl(url, brandKey, ctx = {}) {
  const cfg = OFFICIAL_SOURCES[brandKey];
  if (!cfg) return { allowed: false, reason: "UNKNOWN_BRAND" };
  const host = hostnameOf(url);
  const path = pathnameOf(url);

  if (isBlockedImageHost(host)) {
    return { allowed: false, reason: "BLOCKED_HOST", hostname: host };
  }

  if (cfg.gatedExactImageHosts && cfg.gatedExactImageHosts[host]) {
    return gatedHostAllows(host, brandKey, { ...ctx, imageUrl: url });
  }

  if (Array.isArray(cfg.exactImageHosts) && cfg.exactImageHosts.includes(host)) {
    return { allowed: true, hostname: host, viaExactHost: true };
  }

  // Local distributor pages: allow same-host images from the approved page only.
  const matchType = String(ctx.matchType || ctx.matchStatus || "");
  if (
    /LOCAL_DISTRIBUTOR/i.test(matchType) &&
    ctx.pageUrl &&
    hostMatchesBase(host, hostnameOf(ctx.pageUrl).replace(/^www\./, ""))
  ) {
    return {
      allowed: true,
      hostname: host,
      viaExactHost: true,
      viaPageHost: true,
    };
  }

  const domainOk = cfg.imageDomains.some((d) => hostMatchesBase(host, d));
  if (!domainOk) {
    return { allowed: false, reason: "CDN_CANDIDATE", hostname: host };
  }

  if (Array.isArray(cfg.allowedPathPrefixes) && cfg.allowedPathPrefixes.length > 0) {
    const pathOk = cfg.allowedPathPrefixes.some((p) => path.startsWith(p));
    if (!pathOk) {
      return {
        allowed: false,
        reason: "PATH_NOT_ALLOWED",
        hostname: host,
        path,
      };
    }
  }
  return { allowed: true, hostname: host, viaExactHost: false };
}

module.exports = {
  hostnameOf,
  pathnameOf,
  hostMatchesBase,
  isBlockedImageHost,
  urlsMatchApproved,
  isAllowedPageUrl,
  isAllowedImageUrl,
  gatedHostAllows,
};
