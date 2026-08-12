"use strict";

/**
 * Approved official-image batch for the 140 newly imported Marco products.
 * 102 approved mappings; PENDING entries are intentionally omitted.
 *
 * Runtime matchType is always one of APPROVED_MATCH_TYPES.
 * User approvalStatus is preserved for audit.
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
    default:
      return "EXACT";
  }
}

function entry(opts) {
  const approvalStatus = opts.approvalStatus;
  let matchType = mapRuntimeMatchType(approvalStatus);
  // QR appliance pages need SUPPORT_PAGE so gated Gorenje CDN + headless extract are allowed.
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
    source: "approved-102-batch-2026-08-12",
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

/**
 * Keys MUST match extractModelFromTitle / findOverrideEntry for Mobee titles.
 * Multiple keys may point at the same logical product via shared data.
 */
const BATCH_ROWS = [
  // Samsung TV
  { brand: "samsung", category: "TV", key: "UE65U8000FUXRU", marcoModel: "UE65U8000FUXRU", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/tvs/uhd-4k-tv/u8000f-65-inch-crystal-uhd-4k-smart-tv-ue65u8000fuxru/", directImage: "https://images.samsung.com/is/image/samsung/p6pim/ru/ue65u8000fuxru/gallery/ru-uhd-u8000-ue65u8000fuxru-546259940?$1164_776_PNG$=" },
  { brand: "samsung", category: "TV", key: "UE55U8000FUXRU", marcoModel: "UE55U8000FUXRU", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/tvs/uhd-4k-tv/u8000f-55-inch-crystal-uhd-4k-smart-tv-ue55u8000fuxru/" },
  { brand: "samsung", category: "TV", key: "UE50U8000FUXRU", marcoModel: "UE50U8000FUXRU", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/tvs/uhd-4k-tv/u8000f-50-inch-crystal-uhd-4k-smart-tv-ue50u8000fuxru/" },
  { brand: "samsung", category: "TV", key: "UE43F6000FUXRU", marcoModel: "UE43F6000FUXRU", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/tvs/full-hd-tv/f6000-43-inch-ue43f6000fuxru/" },
  { brand: "samsung", category: "TV", key: "QE85Q7FAAUXRU", marcoModel: "QE85Q7FAAUXRU", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ru/support/model/QE85Q7FAAUXRU/" },
  { brand: "samsung", category: "TV", key: "QE65Q7FAAUXRU", marcoModel: "QE65Q7FAAUXRU", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/tvs/qled-tv/q7f-65-inch-qled-4k-smart-tv-qe65q7faauxru/" },
  { brand: "samsung", category: "TV", key: "QE43Q7FAAUXRU", marcoModel: "QE43Q7FAAUXRU", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/ie/tvs/qled-tv/q7f-43-inch-qled-4k-smart-tv-qe43q7faauxxu/", note: "approved equivalent: official suffix UXXU, Marco UXRU" },

  // Samsung refrigerators
  { brand: "samsung", category: "Refrigerator", key: "RT53DB7B60ETWT", marcoModel: "RT53DB7B60ETWT", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/ru/refrigerators/top-mount-freezer/rt7300d-smartthings-ai-energy-mode-top-mount-freezer-smartthings-ai-energy-mode-540l-essential-beige-rt53db7b60etwr/", note: "approved ETWR source for Marco ETWT" },
  { brand: "samsung", category: "Refrigerator", key: "RT35CG5400S9SG", marcoModel: "RT35CG5400S9SG", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ae/refrigerators/top-mount-freezer/rt5300c-top-mount-freezer-spacemax-350l-silver-rt35cg5400s9sg/" },
  { brand: "samsung", category: "Refrigerator", key: "RS80T5190SL", marcoModel: "RS80T5190SL", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/ae/support/model/RS80T5190SL/SG/", note: "approved official /SG suffix" },
  { brand: "samsung", category: "Refrigerator", key: "RR39M73107F", marcoModel: "RR39M73107F/SG", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ae/refrigerators/one-door/375l-refined-steel-rr39m73107f-sg/" },
  { brand: "samsung", category: "Refrigerator", key: "RH65A5401M9", marcoModel: "RH65A5401M9/EU", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ae/support/model/RH65A5401M9/EU/" },
  { brand: "samsung", category: "Refrigerator", key: "RB50DG602ES9WR", marcoModel: "RB50DG602ES9WR", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/uk/support/model.RB50DG602ES9EF/", note: "approved base, official EF suffix vs Marco WR" },
  { brand: "samsung", category: "Refrigerator", key: "RB31FERNDWW", marcoModel: "RB31FERNDWW/WR", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/pk/support/model/RB31FERNDWW/WT/", note: "approved WT source for Marco WR" },
  { brand: "samsung", category: "Refrigerator", key: "RB29FSRNDWW", marcoModel: "RB29FSRNDWW/WT", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/uk/support/model/RB29FSRNDWW/WT/" },
  { brand: "samsung", category: "Refrigerator", key: "RB29FERNDSA/WT", marcoModel: "RB29FERNDSA/WT", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/uk/support/model/RB29FERNDSA/WT/" },
  { brand: "samsung", category: "Refrigerator", key: "RB29FERNDSA/WR", marcoModel: "RB29FERNDSA/WR", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ru/support/model/RB29FERNDSA/WR/" },

  // Samsung AC
  { brand: "samsung", category: "AC", key: "AR24CXFCABT", marcoModel: "AR24CXFCABT/JO", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/levant/support/model/AR24CXFCABT/JO/" },
  { brand: "samsung", category: "AC", key: "AR18CXFCABT", marcoModel: "AR18CXFCABT/JO", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/levant/support/model/AR18CXFCABT/JO/" },
  { brand: "samsung", category: "AC", key: "AR12CXFCABT", marcoModel: "AR12CXFCABT/JO", approvalStatus: "REVIEW_NORMALIZED", pageUrl: "https://www.samsung.com/levant/support/model/AR12CXFCABTXJO/", note: "same approved region suffix normalized as XJO" },
  { brand: "samsung", category: "AC", key: "AR12CXFCABTXJO", marcoModel: "AR12CXFCABT/JO", approvalStatus: "REVIEW_NORMALIZED", pageUrl: "https://www.samsung.com/levant/support/model/AR12CXFCABTXJO/", note: "alias for compact extractor" },

  // Samsung WM
  { brand: "samsung", category: "Washing Machine", key: "WW80AG6L28BBLP", marcoModel: "WW80AG6L28BBLP", approvalStatus: "EXACT", pageUrl: "https://www.samsung.com/ru/washers-and-dryers/washing-machines/ww6100a-front-loading-eco-bubble-ai-control-lagest-capacity-8kg-white-ww80ag6l28bblp/" },
  { brand: "samsung", category: "Washing Machine", key: "WW70AG6S23AXLP", marcoModel: "WW70AG6S23AXLP", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/az/support/model/WW70AG6S23AXLP/" },
  { brand: "samsung", category: "Washing Machine", key: "WW70AG6S23AELP", marcoModel: "WW70AG6S23AELP", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ru/support/model/WW70AG6S23AELP/" },
  { brand: "samsung", category: "Washing Machine", key: "WW70AG5S20CXLP", marcoModel: "WW70AG5S20CXLP", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ru/support/model/WW70AG5S20CXLP/" },
  { brand: "samsung", category: "Washing Machine", key: "WW90TAO46AX", marcoModel: "WW90TAO46AX", approvalStatus: "REVIEW_TYPO", pageUrl: "https://www.samsung.com/uk/business/washers-and-dryers/washing-machines/front-load-9kg-inox-ww90ta046ax-eu/", note: "Marco uses letter O, official digit 0" },
  { brand: "samsung", category: "Washing Machine", key: "WW90T4541AE", marcoModel: "WW90T4541AE/LP", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.samsung.com/ru/support/model/WW90T4541AE/LP/" },
  { brand: "samsung", category: "Washing Machine", key: "WW80TA046AX1", marcoModel: "WW80TA046AX1", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.samsung.com/lb/washers-and-dryers/washing-machines/ww5000t-front-loading-eco-bubble-hygiene-steam-dit-8kg-platinum-silver-ww80ta046ax1fh/", note: "approved official FH suffix" },

  // Midea refrigerators
  { brand: "midea", category: "Refrigerator", key: "MDRB489FGE02O", marcoModel: "MDRB489FGE02O", approvalStatus: "EXACT", pageUrl: "https://www.midea.com/cz/refrigerators/bottom-mount-freezer/Combined-Refrigerator-330L.mdrb489fge02o", directImage: "https://web-res.midea.com/content/dam/midea-aem/cz/refrigerazione/combinati/mdrb489fge02o/prodotto/MDRB489FGE02O-1.jpg/jcr%3Acontent/renditions/cq5dam.web.5000.5000.jpeg" },
  { brand: "midea", category: "Refrigerator", key: "MDRB470MIE22OM", marcoModel: "MDRB470MIE22OM", approvalStatus: "EXACT", pageUrl: "https://www.midea.com/ge-en/refrigerators/double-door-refrigerator/double-door-mdrb470mie22om.mdrb470mie22om" },
  { brand: "midea", category: "Refrigerator", key: "MDRB424FGF02I", marcoModel: "MDRB424FGF02I", approvalStatus: "EXACT", pageUrl: "https://www.midea.com/ge-en/refrigerators/double-door-refrigerator/double-door-mdrb424fgf01I.mdrb424fgf02i" },
  { brand: "midea", category: "Refrigerator", key: "MDRB424FGF01I", marcoModel: "MDRB424FGF01I", approvalStatus: "EXACT", pageUrl: "https://www.midea.com/ge-en/refrigerators/double-door-refrigerator/double-door-mdrb424fgf01I.mdrb424fgf01i" },

  // Midea WM
  { brand: "midea", category: "Washing Machine", key: "MF100W60/T", marcoModel: "MF100W60/T", approvalStatus: "EXACT", pageUrl: "https://www.midea.com/za/laundry/front-loaders/front-loader-washing-machine-mf100-lunar-dial-series.mf100w60-t" },
  { brand: "midea", category: "Washing Machine", key: "MF100W60/D", marcoModel: "MF100W60/D", approvalStatus: "REVIEW_BASE", pageUrl: "https://www.midea.com/me/laundry/front-load-washer/midea-front-load-washer-with-lunar-dial-hygiene-90-c.mf100w60-w-gcc", note: "approved MF100W60 family source for /D" },
  { brand: "midea", category: "Washing Machine", key: "MF01814BS47/W/D", marcoModel: "MF01814BS47/W/D", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.midea.com/kz/washing-machines/front-load-washing-machines/midea-washing-machines-with-healthguard-technology.mf01814bs47-w", note: "approved official /W base" },
  { brand: "midea", category: "Washing Machine", key: "MF01814BS47/T", marcoModel: "MF01814BS47/T", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://www.midea.com/kz/washing-machines/front-load-washing-machines/midea-washing-machines-with-healthguard-technology.mf01814bs47-w", note: "user approves /W official source for Marco /T" },

  // Bosch WM
  { brand: "bosch", category: "Washing Machine", key: "WNA244X0GC", marcoModel: "WNA244X0GC", approvalStatus: "EXACT", pageUrl: "https://www.bosch-home.com/ae/en/mkt-product/WNA244X0GC", directImage: "https://media3.bsh-group.com/Product_Shots/17635154_WNA244X0GC_STP_def.webp" },
  { brand: "bosch", category: "Washing Machine", key: "WGA14400GC", marcoModel: "WGA14400GC", approvalStatus: "EXACT", pageUrl: "https://www.bosch-home.com/ae/en/mkt-product/washers-dryers/washing-machines/frontloader-washing-machines/WGA14400GC" },
  { brand: "bosch", category: "Washing Machine", key: "WAN28282GC", marcoModel: "WAN28282GC", approvalStatus: "EXACT", pageUrl: "https://www.bosch-home.com/ae/en/mkt-product/washers-dryers/washing-machines/frontloader-washing-machines/WAN28282GC" },
  { brand: "bosch", category: "Washing Machine", key: "WAJ2018SME", marcoModel: "WAJ2018SME", approvalStatus: "EXACT", pageUrl: "https://www.bosch-home.com/ne/en/mkt-product/washers-dryers/washing-machines/front-loading-washing-machines/WAJ2018SME" },

  // LG TV
  { brand: "lg", category: "TV", key: "55UA75009LA", marcoModel: "55UA75009LA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uz/televisions/lg-55ua75009la" },
  { brand: "lg", category: "TV", key: "43UR801COLJ", marcoModel: "43UR801COLJ", approvalStatus: "REVIEW_TYPO", pageUrl: "https://www.lg.com/ae/business/commercial-tv/lg-43ur801c0lj", note: "Marco O vs official digit 0" },
  { brand: "lg", category: "TV", key: "55UR801COLJ", marcoModel: "55UR801COLJ", approvalStatus: "REVIEW_TYPO", pageUrl: "https://www.lg.com/ae/support/product/lg-55UR801C0LJ.AMAE", note: "Marco O vs official digit 0" },
  { brand: "lg", category: "TV", key: "50UR801COLJ", marcoModel: "50UR801COLJ", approvalStatus: "REVIEW_TYPO", pageUrl: "https://www.lg.com/ae/support/product/lg-50UR801C0LJ.AMAE", note: "Marco O vs official digit 0" },
  { brand: "lg", category: "TV", key: "OLED65C36LC", marcoModel: "OLED65C36LC", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/es/tv-y-barras-de-sonido/oled/oled65c36lc/" },
  { brand: "lg", category: "TV", key: "OLED55C36LC", marcoModel: "OLED55C36LC", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/es/tvs-soundbars/smart-tvs/oled55c36lc/" },
  { brand: "lg", category: "TV", key: "55QNED756RA", marcoModel: "55QNED756RA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/qned/55qned756ra/" },
  { brand: "lg", category: "TV", key: "55NANO846QA", marcoModel: "55NANO846QA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/sa_en/tv-soundbars/nanocell/55nano846qa/" },
  { brand: "lg", category: "TV", key: "55NANO766QA", marcoModel: "55NANO766QA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/nanocell/55nano766qa/" },
  { brand: "lg", category: "TV", key: "50UQ80006LB", marcoModel: "50UQ80006LB", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/4k-uhd-tvs/50uq80006lb/" },
  { brand: "lg", category: "TV", key: "50QNED756RA", marcoModel: "50QNED756RA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/qned/50qned756ra/" },
  { brand: "lg", category: "TV", key: "43UR81006LJ", marcoModel: "43UR81006LJ", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/it/tv-soundbar/tv-uhd-4k/43ur81006lj/" },
  { brand: "lg", category: "TV", key: "65QNED756RA", marcoModel: "65QNED756RA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/qned/65qned756ra/" },
  { brand: "lg", category: "TV", key: "65NANO846QA", marcoModel: "65NANO846QA", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/levant_en/tvs-soundbars/lg-65nano846qa" },
  { brand: "lg", category: "TV", key: "65QNED82A6B", marcoModel: "65QNED82A6B", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/qned/65qned82a6b/" },
  { brand: "lg", category: "TV", key: "65NANO81A6A", marcoModel: "65NANO81A6A", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/nanocell/65nano81a6a/" },
  { brand: "lg", category: "TV", key: "55NANO81A6A", marcoModel: "55NANO81A6A", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/uk/tvs-soundbars/nanocell/55nano81a6a/" },

  // LG refrigerators
  { brand: "lg", category: "Refrigerator", key: "GR-B589BQCM", marcoModel: "GR-B589BQCM", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ae/support/product/lg-GR-B589BQCM" },
  { brand: "lg", category: "Refrigerator", key: "GR-X267CQEW", marcoModel: "GR-X267CQEW", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ir/support/product/lg-GR-X267CQEW" },
  { brand: "lg", category: "Refrigerator", key: "GR-B452PGFK", marcoModel: "GR-B452PGFK", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/ae_ar/refrigerators/lg-gr-b452pgfk" },
  { brand: "lg", category: "Refrigerator", key: "GR-A34FDMKJ", marcoModel: "GR-A34FDMKJ", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/ae/refrigerators/lg-gr-a34fdmkj" },
  { brand: "lg", category: "Refrigerator", key: "GR-B459FQFW", marcoModel: "GR-B459FQFW", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/ae/refrigerators/lg-gr-b459fqfw" },
  { brand: "lg", category: "Refrigerator", key: "GN-F702HLHU", marcoModel: "GN-F702HLHU", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/africa/support/product/lg-GN-F702HLHU" },
  { brand: "lg", category: "Refrigerator", key: "GN-C752HQCL", marcoModel: "GN-C752HQCL", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/levant_en/support/product/lg-GN-C752HQCL" },
  { brand: "lg", category: "Refrigerator", key: "GN-B502PLGB", marcoModel: "GN-B502PLGB", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/africa/support/product/lg-GN-B502PLGB" },
  { brand: "lg", category: "Refrigerator", key: "GN-B422PLGB", marcoModel: "GN-B422PLGB", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ae/support/product/lg-GN-B422PLGB" },
  { brand: "lg", category: "Refrigerator", key: "GC-X24FFCBB", marcoModel: "GC-X24FFCBB", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/kz/refrigerators/multi-door-fridge-freezers/gc-x24ffcbb/" },
  { brand: "lg", category: "Refrigerator", key: "GR-X29FTLML", marcoModel: "GR-X29FTLML", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/africa/support/product/lg-GR-X29FTLML" },

  // LG AC / WM
  { brand: "lg", category: "AC", key: "DA12CEH", marcoModel: "DA12CEH", approvalStatus: "EXACT", pageUrl: "https://www.lg.com/ae/non-tropical-split-air-conditioners/lg-da12ceh" },
  { brand: "lg", category: "Washing Machine", key: "F2Y1VYP6JP", marcoModel: "F2Y1VYP6JP", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/eastafrica/support/product/lg-F2Y1VYP6JP" },
  { brand: "lg", category: "Washing Machine", key: "WT1310YJ", marcoModel: "WT1310YJ", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/eastafrica/support/product/lg-WT1310YJ" },
  { brand: "lg", category: "Washing Machine", key: "F2Y1HYP6J", marcoModel: "F2Y1HYP6J", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ae/support/product/lg-F2Y1HYP6J", note: "title also mentions F2Y2HYP6J" },
  { brand: "lg", category: "Washing Machine", key: "F2Y1HYP65P", marcoModel: "F2Y1HYP65P", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/africa/support/product/lg-F2Y1HYP65P", note: "title also mentions F2Y2HYP65" },
  { brand: "lg", category: "Washing Machine", key: "L5C0905PSGC", marcoModel: "L5C0905PSGC", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ae/support/product/lg-L5C0905PSGC" },
  { brand: "lg", category: "Washing Machine", key: "F2V7GWL1W", marcoModel: "F2V7GWL1W", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/ae/support/product/lg-F2V7GWL1W" },
  { brand: "lg", category: "Washing Machine", key: "F2V7GWL2P", marcoModel: "F2V7GWL2P", approvalStatus: "EXACT_SUPPORT", pageUrl: "https://www.lg.com/africa/support/product/lg-F2V7GWL2P" },

  // Hisense TV
  { brand: "hisense", category: "TV", key: "85U7NQ", marcoModel: "85U7NQ", approvalStatus: "EXACT", pageUrl: "https://hr.hisense.com/proizvodi/tv/uled-miniled-tv/TV-SET-85U7NQ-HSN/p/000000000020013352" },
  { brand: "hisense", category: "TV", key: "75E7Q", marcoModel: "75E7Q", approvalStatus: "EXACT", pageUrl: "https://mk.hisense.com/proizvodi/televizori/hi-qled-tv/TV-SET-75E7Q-HSN/p/000000000020016418" },
  { brand: "hisense", category: "TV", key: "65E7Q", marcoModel: "65E7Q", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://uk.hisense.com/products/tv/qled-tv/TV-SET-65E7QTUK-HSN%27%2522/p/000000000020016410", note: "approved official 65E7QTUK source" },
  { brand: "hisense", category: "TV", key: "58E7Q", marcoModel: "58E7Q", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://uk.hisense.com/products/tv/qled-tv/TV-SET-58E7QTUK-HSN/p/000000000020016736/972531%2525252540", note: "approved official 58E7QTUK source" },
  { brand: "hisense", category: "TV", key: "55A7Q", marcoModel: "55A7Q", approvalStatus: "EXACT", pageUrl: "https://de.hisense.com/produkte/tv/hi-qled-tv/TV-SET-55A7Q-HSN/p/000000000020016324" },
  { brand: "hisense", category: "TV", key: "43E7Q", marcoModel: "43E7Q", approvalStatus: "EXACT", pageUrl: "https://gr.hisense.com/products/tv/hi-qled-tv/TV-SET-43E7Q-HSN/p/000000000020015991" },
  { brand: "hisense", category: "TV", key: "32A4Q", marcoModel: "32A4Q", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://uk.hisense.com/products/tv/fhd-hd-tv/TV-SET-32A4QTUK-HSN/p/000000000020016127", note: "approved official 32A4QTUK source" },
  { brand: "hisense", category: "TV", key: "65A61N", marcoModel: "65A61N", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200131790000000000000000000?lang=en", note: "user approves official 65A6N source" },
  { brand: "hisense", category: "TV", key: "55A62NS", marcoModel: "55A62NS", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200138500000000000000000000?lang=en", note: "user approves official 55A6N source" },
  { brand: "hisense", category: "TV", key: "85A7K", marcoModel: "85A7K", approvalStatus: "REVIEW_SUFFIX", pageUrl: null, lookupAlias: "85A7KAU", note: "NO_CANONICAL_URL — lookup for 85A7KAU on hisense.com found no verified HTML product page" },
  { brand: "hisense", category: "TV", key: "65U7HQ", marcoModel: "65U7HQ", approvalStatus: "EXACT", pageUrl: "https://ua.hisense.com/products/tv/uled-mini-led-tv/TV-SET-65U7HQ-HSN/p/000000000020009566" },
  { brand: "hisense", category: "TV", key: "50A62NS", marcoModel: "50A62NS", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://me.hisense.com/proizvodi/televizori/uhd-tv/TV-SET-50A6N-HSN/p/000000000020013852", note: "user approves official 50A6N source" },
  { brand: "hisense", category: "TV", key: "75A62NS", marcoModel: "75A62NS", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200131250000000000000000000?lang=en", note: "user approves official 75A6N source" },
  { brand: "hisense", category: "TV", key: "65A62NS", marcoModel: "65A62NS", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://no.hisense.com/produkter/tv/uhd-tv/TV-SET-65A6N-HSN/p/000000000020013179", note: "user approves official 65A6N source" },
  { brand: "hisense", category: "TV", key: "50E7Q", marcoModel: "50E7Q", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://uk.hisense.com/products/tv/qled-tv/TV-SET-50E7QTUK-HSN/p/000000000020015951/965430%252540", note: "approved official 50E7QTUK source" },
  { brand: "hisense", category: "TV", key: "50A61N", marcoModel: "50A61N", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://uk.hisense.com/products/tv/uhd-tv/50A6NTUK-GB-HSN/p/000000000020013853", note: "user approves official 50A6N/TUK source" },
  { brand: "hisense", category: "TV", key: "43A62NS", marcoModel: "43A62NS", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://qrcode.hisense.com/appliance/20014042?lang=en", note: "user approves official 43A6N source" },
  { brand: "hisense", category: "TV", key: "32A4K", marcoModel: "32A4K", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://uk.hisense.com/products/tv/fhd-hd-tv/TV-SET-32A4KTUK-HSN/p/000000000020011556", lookupAlias: "32A4KTUK", note: "official 32A4KTUK verified on uk.hisense.com" },

  // Hisense refrigerators
  { brand: "hisense", category: "Refrigerator", key: "RW12D4NWG0", marcoModel: "RW12D4NWG0", approvalStatus: "EXACT_QR", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200109360000000000000000000?lang=en" },
  { brand: "hisense", category: "Refrigerator", key: "RQ768N4GBE", marcoModel: "RQ768N4GBE", approvalStatus: "EXACT", pageUrl: "https://uk.hisense.com/products/%252525252525252525252525252525252525252525252525252525252525252529/freestanding-refrigerators/cross-door-refrigerators/REFRIG-BCD-605W-RQ768N4GBE-HSN/p/000000000020012750" },
  { brand: "hisense", category: "Refrigerator", key: "RQ561N4AC1", marcoModel: "RQ561N4AC1", approvalStatus: "REVIEW_MODEL_VARIANT", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200009670000000000000000000?lang=en", note: "user approves official RQ562N4AC1 source" },
  { brand: "hisense", category: "Refrigerator", key: "RB645N4BFE", marcoModel: "RB645N4BFE", approvalStatus: "EXACT", pageUrl: "https://uk.hisense.com/products/cooling/freestanding-refrigerators/combi-refrigerators/REFRIG-BCD-469WY-RB645N4BFE-HSN/p/000000000020004006%3B979220%2525252525252540" },
  { brand: "hisense", category: "Refrigerator", key: "RB645N4BIE", marcoModel: "RB645N4BIE", approvalStatus: "EXACT_QR", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200040070000000000000000000?lang=en-US" },

  // Hisense WM
  { brand: "hisense", category: "Washing Machine", key: "WF3S7021BWU", marcoModel: "WF3S7021BWU", approvalStatus: "EXACT", pageUrl: "https://ru.hisense.com/catalog/washing-machines/WF3S7021BWU/" },
  { brand: "hisense", category: "Washing Machine", key: "WF3S7021BTU", marcoModel: "WF3S7021BTU/A", approvalStatus: "REVIEW_BASE", pageUrl: "https://qrcode.hisense.com/appliance/20011889?lang=en", note: "user approves official base WF3S7021BW source" },
  { brand: "hisense", category: "Washing Machine", key: "WF1I6022BWU", marcoModel: "WF1I6022BWU", approvalStatus: "REVIEW_SUFFIX", pageUrl: "https://ru.hisense.com/catalog/washing-machines/WF1I6022BWUC/", note: "user approves official WF1I6022BWU/C source" },
  { brand: "hisense", category: "Washing Machine", key: "WDQA9014EVJMT", marcoModel: "WDQA9014EVJMT", approvalStatus: "EXACT_QR", pageUrl: "https://qrcode.hisense.com/appliance/0000000000200101430000000000000000000?lang=en-AU" },
];

function buildOverrideMaps() {
  const byBrand = {};
  const uniqueLogical = new Set();
  for (const row of BATCH_ROWS) {
    if (!byBrand[row.brand]) byBrand[row.brand] = {};
    const e = entry(row);
    byBrand[row.brand][row.key] = e;
    uniqueLogical.add(`${row.brand}::${row.marcoModel}`);
  }
  return { byBrand, uniqueLogicalCount: uniqueLogical.size, keyCount: BATCH_ROWS.length };
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
  buildOverrideMaps,
  modelsCsvCompact,
  mapRuntimeMatchType,
  entry,
};
