"use strict";

/**
 * Official manufacturer page/image allowlists for Marco image replacement.
 */

const {
  GROUP_TO_BRAND,
  GROUPS,
  GROUP_KEYS,
  CATEGORY_RULES,
  BRAND_RULES,
  ALLOWED_BRAND_KEYS,
  categoryMatchesGroup,
  categoryMatchesAllowedMatrix,
} = require("../marco/groups.constants.cjs");

const OFFICIAL_SOURCES = {
  samsung: {
    pageDomains: ["samsung.com"],
    imageDomains: ["samsung.com", "images.samsung.com"],
  },
  bosch: {
    pageDomains: ["bosch-home.com"],
    imageDomains: ["bosch-home.com", "media3.bosch-home.com"],
    // Exact hostnames only — no *.bsh-group.com wildcard.
    exactImageHosts: ["media3.bsh-group.com"],
  },
  lg: {
    pageDomains: ["lg.com"],
    imageDomains: ["lg.com"],
    allowedPathPrefixes: ["/content/dam/"],
  },
  hisense: {
    pageDomains: [
      "hisense.com",
      "global.hisense.com",
      "qrcode.hisense.com",
      "hisense.co.za",
      "hisense.cl",
      "hisenseme.com",
      "hisenseme.co",
      "hisense.ci",
      "hisense-usa.com",
    ],
    imageDomains: [
      "hisense.com",
      "global.hisense.com",
      "qrcode.hisense.com",
      "hisense.co.za",
      "hisense.cl",
      "hisenseme.com",
      "hisenseme.co",
      "hisense.ci",
      "hisense-usa.com",
    ],
    // Only the specific approved override URL may use this host — never auto-search.
    exactPageHostsOnly: ["pos.shophisense.com", "vlv.am", "www.vlv.am"],
    exactImageHosts: [
      "pos.shophisense.com",
      "vlv.am",
      "www.vlv.am",
      "files.hisense-usa.com",
    ],
    // Exact hostnames only — no *.hisense.ru / *.gorenje.com wildcards.
    // Gated in domain.utils / extractors by approved page provenance.
    gatedExactImageHosts: {
      "cdn.hisense.ru": {
        requirePageHostSuffix: "ru.hisense.com",
      },
      "static14.gorenje.com": {
        requirePageHostSuffix: "qrcode.hisense.com",
        requireMatchTypes: ["SUPPORT_PAGE"],
        pathIncludesAny: ["/qr-product/", "/imagelib/qr-product/"],
      },
    },
  },
  midea: {
    pageDomains: ["midea.com"],
    imageDomains: ["midea.com"],
    allowedPathPrefixes: ["/content/dam/"],
    // Only specific approved mideaarmenia.am URLs — never whole-site search.
    exactPageHostsOnly: ["mideaarmenia.am", "www.mideaarmenia.am"],
    exactImageHosts: ["mideaarmenia.am", "www.mideaarmenia.am"],
  },
};

/** Never accept review / UGC hosts even if discovered on official pages. */
const BLOCKED_IMAGE_HOSTS = [
  "apps.bazaarvoice.com",
  "photos-us.bazaarvoice.com",
  "placehold.co",
  "via.placeholder.com",
];

const BRAND_ALIASES = {
  samsung: ["samsung"],
  bosch: ["bosch"],
  lg: ["lg"],
  hisense: ["hisense", "hisens"],
  midea: ["midea"],
};

const BRAND_SEARCH_SITES = {
  samsung: ["samsung.com"],
  bosch: ["bosch-home.com"],
  lg: ["lg.com"],
  hisense: ["hisense.com", "global.hisense.com", "hisense.co.za"],
  midea: ["midea.com"],
};

const APPROVED_MATCH_TYPES = [
  "EXACT",
  "EXACT_CORRECTED_MODEL",
  "APPROVED_REGIONAL_ANALOG",
  "SUPPORT_PAGE",
  "APPROVED_LOCAL_DISTRIBUTOR",
];

/** User-facing approval statuses stored on override entries (audit only). */
const USER_APPROVAL_STATUSES = [
  "EXACT",
  "EXACT_SUPPORT",
  "EXACT_QR",
  "REVIEW_SUFFIX",
  "REVIEW_TYPO",
  "REVIEW_BASE",
  "REVIEW_NORMALIZED",
  "REVIEW_MODEL_VARIANT",
];

const OVERRIDES_PATH_REL = "scripts/official-product-page-overrides.json";

const MIN_IMAGE_BYTES = 10 * 1024;
const MAX_OFFICIAL_IMAGES = 10;

const EXTRACTION_SOURCES = [
  "JSON_LD_PRODUCT_IMAGE",
  "PRODUCT_GALLERY_JSON",
  "EMBEDDED_PRODUCT_STATE",
  "PRODUCT_GALLERY_DOM",
  "PRODUCT_SRCSET",
  "PRODUCT_OG_IMAGE",
  "SUPPORT_PRODUCT_IMAGE",
  "HEADLESS_PRODUCT_GALLERY",
  "MANUAL_APPROVED_IMAGE",
  "MANUAL_USER_APPROVED_SHARED_SERIES_IMAGE",
];

const MANUAL_IMAGE_EVIDENCE = "MANUAL_APPROVED_IMAGE";
const MANUAL_SHARED_SERIES_IMAGE_EVIDENCE =
  "MANUAL_USER_APPROVED_SHARED_SERIES_IMAGE";

const MANUAL_IMAGE_EVIDENCE_SET = new Set([
  MANUAL_IMAGE_EVIDENCE,
  MANUAL_SHARED_SERIES_IMAGE_EVIDENCE,
]);

const APPROVED_PAGE_STATUSES = [
  "READY",
  "ALREADY_OFFICIAL",
  "NO_VALID_IMAGES",
  "PAGE_FETCH_FAILED",
  "MODEL_MISMATCH",
  "EXTRACTION_FAILED",
  "OTHER",
];

module.exports = {
  OFFICIAL_SOURCES,
  BLOCKED_IMAGE_HOSTS,
  BRAND_ALIASES,
  GROUP_TO_BRAND,
  GROUPS,
  GROUP_KEYS,
  CATEGORY_RULES,
  BRAND_RULES,
  ALLOWED_BRAND_KEYS,
  categoryMatchesGroup,
  categoryMatchesAllowedMatrix,
  BRAND_SEARCH_SITES,
  APPROVED_MATCH_TYPES,
  USER_APPROVAL_STATUSES,
  OVERRIDES_PATH_REL,
  MIN_IMAGE_BYTES,
  MAX_OFFICIAL_IMAGES,
  EXTRACTION_SOURCES,
  MANUAL_IMAGE_EVIDENCE,
  MANUAL_SHARED_SERIES_IMAGE_EVIDENCE,
  MANUAL_IMAGE_EVIDENCE_SET,
  APPROVED_PAGE_STATUSES,
};
