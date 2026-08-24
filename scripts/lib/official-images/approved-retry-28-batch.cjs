"use strict";

/**
 * Retry batch: 28 user-approved pages for products that were PENDING / failed earlier.
 * Media-only; scoped via product-ids file at apply time.
 */

function mapRuntimeMatchType(approvalStatus) {
  switch (approvalStatus) {
    case "EXACT":
      return "EXACT";
    case "EXACT_SUPPORT":
    case "EXACT_QR":
      return "SUPPORT_PAGE";
    case "REVIEW_SUFFIX":
    case "REVIEW_TYPO":
    case "REVIEW_BASE":
    case "REVIEW_NORMALIZED":
    case "REVIEW_MODEL_VARIANT":
      return "EXACT_CORRECTED_MODEL";
    case "LOCAL_DISTRIBUTOR":
      return "APPROVED_LOCAL_DISTRIBUTOR";
    default:
      return "EXACT";
  }
}

function entry(opts) {
  const approvalStatus = opts.approvalStatus;
  let matchType = opts.matchType || mapRuntimeMatchType(approvalStatus);
  if (
    opts.pageUrl &&
    /qrcode\.hisense\.com/i.test(opts.pageUrl) &&
    matchType !== "SUPPORT_PAGE"
  ) {
    matchType = "SUPPORT_PAGE";
  }
  const out = {
    pageUrl: opts.pageUrl || null,
    normalizedModel: opts.normalizedModel || opts.key,
    matchType,
    approvalStatus,
    approved: true,
    source: "approved-retry-28-batch-2026-08-12",
    brand: opts.brand,
    category: opts.category,
    marcoModel: opts.marcoModel,
    note: opts.note || null,
  };
  if (opts.directImage) {
    out.approvedImageUrls = [
      {
        url: opts.directImage,
        evidence: "MANUAL_APPROVED_IMAGE",
        allowLowResolution: false,
      },
    ];
  }
  if (opts.lookupAlias) out.lookupAlias = opts.lookupAlias;
  return out;
}

/** Keys MUST appear in Mobee product titles (compact match). */
const BATCH_ROWS = [
  // 1 Samsung WM
  {
    brand: "samsung",
    category: "Washing Machine",
    key: "WW90T604CLH/LP",
    marcoModel: "WW90T604CLH/LP",
    approvalStatus: "EXACT_SUPPORT",
    pageUrl: "https://www.samsung.com/ru/support/model/WW90T604CLH/LP/",
  },

  // 2–4 Midea WM (local Armenia)
  {
    brand: "midea",
    category: "Washing Machine",
    key: "MFA01W80B/W-C",
    marcoModel: "MFA01W80B/W-C",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://www.mideaarmenia.am/midea-mfa01w80b-w-c",
  },
  {
    brand: "midea",
    category: "Washing Machine",
    key: "MFA01W70B/W-C",
    marcoModel: "MFA01W70B/W-C",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://mideaarmenia.am/midea-mfa01w70b-w-c",
  },
  {
    brand: "midea",
    category: "Washing Machine",
    key: "MFA01W70B/T-C",
    marcoModel: "MFA01W70B/T-C",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://www.mideaarmenia.am/midea-mfa01w70b-t-c",
  },

  // 5 Bosch WM
  {
    brand: "bosch",
    category: "Washing Machine",
    key: "WGK2522XTR",
    marcoModel: "WGK2522XTR",
    normalizedModel: "WGK252ZXTR",
    approvalStatus: "REVIEW_TYPO",
    pageUrl: "https://www.bosch-home.com/us/en/productservice/WGK252ZXTR-01",
    note: "approved official WGK252ZXTR for Marco WGK2522XTR",
  },

  // 6–9 LG
  {
    brand: "lg",
    category: "Refrigerator",
    key: "GC-J257SQKV",
    marcoModel: "GC-J257SQKV",
    normalizedModel: "GC-J257SQKS",
    approvalStatus: "REVIEW_MODEL_VARIANT",
    pageUrl: "https://www.lg.com/za/fridge-freezers/side-by-side/gc-j257sqks/",
    note: "approved official GC-J257SQKS",
  },
  {
    brand: "lg",
    category: "Air Conditioner",
    key: "DA18CEN",
    marcoModel: "DA18CEN",
    normalizedModel: "DA18CEH",
    approvalStatus: "REVIEW_MODEL_VARIANT",
    pageUrl: "https://www.lg.com/ae/non-tropical-split-air-conditioners/lg-da18ceh",
    note: "approved official DA18CEH",
  },
  {
    brand: "lg",
    category: "Washing Machine",
    key: "F2X5PYNY6",
    marcoModel: "F2X5PYNY6",
    approvalStatus: "EXACT",
    pageUrl:
      "https://www.lg.com/ma/lave-linge-et-seche-linge/lave-linge-a-chargement-frontal/f2x5pyny6/",
  },
  {
    brand: "lg",
    category: "Washing Machine",
    key: "F4V5VYLOW",
    marcoModel: "F4V5VYLOW",
    normalizedModel: "F4V5VYL0W",
    approvalStatus: "REVIEW_TYPO",
    pageUrl: "https://www.lg.com/ae/support/product/lg-F4V5VYL0W",
    note: "approved official F4V5VYL0W (zero)",
  },

  // 10–17 Hisense first group
  {
    brand: "hisense",
    category: "TV",
    key: "43A4K",
    marcoModel: "43A4K",
    approvalStatus: "EXACT",
    pageUrl: "https://files.hisense-usa.com/download/f256489d13ed9a0f",
    note: "user-approved Hisense USA file asset; may need manual image if not HTML",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RD-39WCR-INOX",
    marcoModel: "RD-39WCR-INOX",
    normalizedModel: "RD-39WC",
    approvalStatus: "REVIEW_BASE",
    pageUrl: "https://hisense.cl/productos/refrigeradores/rd-39wc/",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RD39WC BG",
    marcoModel: "RD39WC BG",
    normalizedModel: "RD-39WC",
    approvalStatus: "REVIEW_BASE",
    pageUrl: "https://hisense.cl/productos/refrigeradores/rd-39wc/",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RT729N4WSU1",
    marcoModel: "RT729N4WSU1",
    approvalStatus: "EXACT",
    pageUrl: "https://www.hisenseme.com/products/729l-with-dispenser",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RT3N635NAD4",
    marcoModel: "RT3N635NAD4",
    approvalStatus: "EXACT",
    pageUrl: "https://hisenseme.com/products/top-mount-830l-rt3n635nad4",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RT328N4DGN",
    marcoModel: "RT328N4DGN",
    approvalStatus: "EXACT",
    pageUrl: "https://hisenseme.com/products/328l-refrigerator-rt328n4dgn",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RQ561N4AB1",
    marcoModel: "RQ561N4AB1",
    approvalStatus: "EXACT",
    pageUrl:
      "https://products.hisenseme.co/products/432l-cross-door-refrigerator-rq561n4ab1",
  },
  {
    brand: "hisense",
    category: "Washing Machine",
    key: "WFIB7012MT",
    marcoModel: "WFIB7012MT",
    normalizedModel: "WFVB7012MT",
    approvalStatus: "REVIEW_MODEL_VARIANT",
    pageUrl:
      "https://hisense.ci/hisense_machine_a_laver_7kg_a%2B%2B%2B_front_load___snowflake_drum___wfvb7012mt-2567.html",
    note: "approved official WFVB7012MT",
  },

  // 18–28 Hisense found later (vlv.am + ZA + more)
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "DT27DR4 Inox",
    marcoModel: "DT27DR4 Inox",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/18860",
    note: "Inox only — do not apply to DT27DR4 Black",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "DB35DCUR Inox",
    marcoModel: "DB35DCUR Inox",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/7547",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RS12DR-Silver",
    marcoModel: "RS12DR-Silver",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/18503",
  },
  {
    brand: "hisense",
    category: "Refrigerator",
    key: "RD33WCRWD Inox",
    marcoModel: "RD33WCRWD Inox",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/26929",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS12UW4SYRKC01",
    marcoModel: "AS12UW4SYRKC01",
    approvalStatus: "EXACT",
    pageUrl:
      "https://hisense.co.za/products/hisense-as-12uw4syrck01-air-conditioner/",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS09UW4SYRKC00A",
    marcoModel: "AS09UW4SYRKC00A",
    approvalStatus: "EXACT",
    pageUrl:
      "https://hisense.co.za/products/hisense-as-09uw4syrck00a-air-conditioner/",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS09HR4SYD TD",
    marcoModel: "AS09HR4SYD TD",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/17103",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS09HR4SY DDE",
    marcoModel: "AS09HR4SY DDE",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/18264",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS-12UW4RYRCA03A",
    marcoModel: "AS-12UW4RYRCA03A",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/31150",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AS-12HR4SVDDJ",
    marcoModel: "AS-12HR4SVDDJ",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/18405",
  },
  {
    brand: "hisense",
    category: "Air Conditioner",
    key: "AST-24UW4RBTCA02B",
    marcoModel: "AST-24UW4RBTCA02B",
    approvalStatus: "LOCAL_DISTRIBUTOR",
    pageUrl: "https://vlv.am/en/Product/37364",
  },
];

/** Exact Mobee product IDs for this retry (excludes DT27DR4 Black twin). */
const PRODUCT_IDS = [
  "cmsq0c8u1e5f4f4e549fade08", // Samsung WW90T604CLH/LP
  "cmsq0cf9x177da4c845749ed7", // Midea MFA01W80B/W-C
  "cmsq0cfvh00d5742b63104ab4", // Midea MFA01W70B/W-C
  "cmsq0cgm6e0b3be27bb91467d", // Midea MFA01W70B/T-C
  "cmsq0chufbffba6a37e92399d", // Bosch WGK2522XTR
  "cmsq0d3g1246b23b729bacf1e", // LG GC-J257SQKV
  "cmsq0d55see3c9a34fd0d0778", // LG DA18CEN
  "cmsq0d65f90cecaf55e0437de", // LG F2X5PYNY6
  "cmsq0d6xxfa85e22b79d083e3", // LG F4V5VYLOW
  "cmsq0djea33a270a1f028e458", // Hisense 43A4K
  "cmsq0dlvq7cc99ff8431de766", // RD-39WCR-INOX
  "cmsq0dmqaa6f4497ccda4e04d", // RD39WC BG
  "cmsq0dngl7aa153c4d85b8ff9", // RT729N4WSU1
  "cmsq0do79748131708cefedba", // RT3N635NAD4
  "cmsq0dowcb46729fdd65ac1be", // RT328N4DGN
  "cmsq0du7u2c295b00addfc7ad", // RQ561N4AB1
  "cmsq0e5fv2803b43c87da18a3", // WFIB7012MT
  "cmsq0dkx5e754996cac0a2522", // DT27DR4 Inox only
  "cmsq0dlho3f61494cab40acf4", // DB35DCUR Inox
  "cmsq0dppr8bca63f688304379", // RS12DR-Silver
  "cmsq0dwps03cffcc6b7235ca3", // RD33WCRWD Inox
  "cmsq0dyrv793179e9f14d1fdf", // AS12UW4SYRKC01
  "cmsq0dzes4548f45ed56a6073", // AS09UW4SYRKC00A
  "cmsq0dzzzda6acd41bc4b2aef", // AS09HR4SYD TD White
  "cmsq0e0kde36e478eba784452", // AS09HR4SY DDE black
  "cmsq0e2j8dbcba2768fd9c1e0", // AS-12UW4RYRCA03A
  "cmsq0e3xa98e2e24b888a188b", // AS-12HR4SVDDJ
  "cmsq0e4p0d50ca6e925ade35c", // AST-24UW4RBTCA02B
];

function buildOverrideMaps() {
  const byBrand = {};
  const uniqueLogical = new Set();
  for (const row of BATCH_ROWS) {
    if (!byBrand[row.brand]) byBrand[row.brand] = {};
    byBrand[row.brand][row.key] = entry(row);
    uniqueLogical.add(`${row.brand}::${row.marcoModel}`);
  }
  return {
    byBrand,
    uniqueLogicalCount: uniqueLogical.size,
    keyCount: BATCH_ROWS.length,
  };
}

function modelsCsvCompact() {
  const { compactModel } = require("./model.utils.cjs");
  const set = new Set();
  for (const row of BATCH_ROWS) {
    set.add(compactModel(row.key));
    set.add(compactModel(row.marcoModel));
    if (row.normalizedModel) set.add(compactModel(row.normalizedModel));
  }
  return [...set].filter(Boolean).sort();
}

module.exports = {
  BATCH_ROWS,
  PRODUCT_IDS,
  buildOverrideMaps,
  modelsCsvCompact,
  mapRuntimeMatchType,
  entry,
};
