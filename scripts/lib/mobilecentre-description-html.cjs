"use strict";

const NOISE_PATTERNS = [
  /Նշված արժեքը/,
  /Ապառիկը ձևակերպելիս/,
  /Յունիբանկ/,
  /ԱԿԲԱ Բանկ/,
  /Ինեկոբանկ/,
  /ՎՏԲ/,
  /unibank\.am/,
  /acba\.am/,
  /inecobank\.am/,
  /vtb\.am/,
  /Tweet/,
  /Share/,
  /Դուք հաջողությամբ/,
  /Ապրանքը պահպանված/,
  /Բոնուսային միավոր/,
  /Մեր մասին/,
  /© 20/,
  /MobileCentre/,
  /\+374/,
  /Նմանատիպ ապրանքներ/,
  /^Գին[`'՝]?\s*$/,
];

const RELATED_PRODUCTS_LABELS = new Set([
  "Նմանատիպ ապրանքներ",
  "Գին՝",
  "Գին:",
  "Գին",
]);

const SECTION_HEADERS = new Set([
  "Կապ",
  "Պրոցեսորներ, Միջուկներ, Թելեր",
  "Հիշողություն",
  "Ընդհանուր բնութագրեր",
  "Հիշողություն և Պրոցեսոր",
  "Ցանց",
  "Սնուցում",
  "Այլ",
  "Տեսախցիկներ",
  "Էկրան",
  "Հիմնական",
]);

const SECTION_SLUGS = {
  "Կապ": "network",
  "Պրոցեսորներ, Միջուկներ, Թելեր": "processor",
  "Հիշողություն": "memory",
  "Ընդհանուր բնութագրեր": "general",
  "Էկրան": "screen",
  "Տեսախցիկներ": "cameras",
  "Հիշողություն և Պրոցեսոր": "memory",
  "Ցանց": "network",
  "Սնուցում": "power",
  "Այլ": "other",
  "Հիմնական": "general",
};

const SPEC_LABELS = new Set([
  "Առկա է խանութներում",
  "Երաշխիք",
  "Հայտարարության տարին",
  "Օպերացիոն համակարգ",
  "Էկրանի տեսակը",
  "Էկրանի կետայնություն",
  "Էկրանի չափսը",
  "Դիմային տեսախցիկ",
  "Հիմնական տեսախցիկ",
  "Ներկառուցված հիշողություն",
  "Պրոցեսոր",
  "SIM քարտի տեսակը",
  "Բլութուս",
  "Wi-fi",
  "Wi-Fi",
  "Ակումուլատոր",
  "Արագ լիցքավորում",
  "Արագ գազարկում",
  "Ջրակայուն",
  "Չափսը",
  "Քաշը",
  "Գույնը",
  "Մոդել",
  "Արտադրող",
  "Էկրանի տեսակ",
  "Էկրանի լուծաչափ",
  "Էկրանի անկյունագիծ",
  "Էկրանի չափս",
  "Վեբ տեսախցիկ",
  "Օպերատիվ հիշողություն",
  "Կոշտ սկավառակի հիշողություն",
  "Կոշտ սկավառակի տեսակ",
  "Գրաֆիկական հիշողություն",
  "Պրոցեսորի մոդել",
  "SIM քարտի տեսակ",
  "Bluetooth",
  "WiFi",
  "Մարտկոց",
  "Չափսեր",
  "Քաշ",
  "Գույն",
  "Տեսակ",
  "Սարքի տեսակ",
  "Այլ",
  "Storage",
  "Memory",
  "Type",
  "Other",
  "Device type",
  "Operating system",
  "Screen diagonal",
  "Screen resolution",
  "Display type",
  "RAM",
  "Graphics memory",
  "Storage type",
  "Webcam",
  "Color",
  "Dimensions",
  "Weight",
  "Battery",
  "Warranty",
  "Память",
  "Встроенная память",
  "Тип устройства",
  "Тип накопителя",
  "SIM card",
]);

const STATUS_ONLY_TOKENS = new Set(["Առկա է խանութներում"]);

const VALUE_PATTERNS = [
  /^\d+(\.\d+)?\s*(inch|inches|in)\b/i,
  /^\d+(\.\d+)?\s*(cm|mm|mAh|Wh|W|kg|g|Hz|GHz|MHz|MP)\b/i,
  /^\d+\s*(GB|TB|MB)\b/i,
  /^\d+\s*x\s*\d+/i,
  /^\d{4}$/,
  /^\d+\s*(months?|years?)\b/i,
  /^(Այո|Ոչ|Yes|No)$/i,
  /^(macOS|iOS|iPadOS|Windows|Android|Linux|HarmonyOS)$/i,
  /^(SSD|HDD|NVMe|eMMC|UFS)$/i,
  /^(Notebook|Laptop|Smartphone|Tablet|Desktop|Ultrabook|MacBook)$/i,
];

function looksLikeValue(token) {
  if (!token) return false;
  if (VALUE_PATTERNS.some((pattern) => pattern.test(token))) {
    return true;
  }
  if (/^[A-Z0-9][\w\s\-./+%(),]*$/i.test(token) && token.length <= 80) {
    return !SPEC_LABELS.has(token) && !SECTION_HEADERS.has(token);
  }
  return false;
}

function looksLikeLabel(token) {
  if (!token) return false;
  if (SPEC_LABELS.has(token) || SECTION_HEADERS.has(token)) {
    return true;
  }
  if (/[\u0531-\u0587]/.test(token)) {
    return !looksLikeValue(token);
  }
  return false;
}

function pairConfidence(left, right) {
  const leftIsLabel = looksLikeLabel(left);
  const rightIsLabel = looksLikeLabel(right);
  const leftIsValue = looksLikeValue(left);
  const rightIsValue = looksLikeValue(right);

  if (leftIsLabel && rightIsValue && !rightIsLabel) return "label-value";
  if (leftIsValue && rightIsLabel && !leftIsLabel) return "value-label";
  if (SPEC_LABELS.has(left) && !SPEC_LABELS.has(right)) return "label-value";
  if (SPEC_LABELS.has(right) && !SPEC_LABELS.has(left)) return "value-label";
  return "low";
}

function pushRow(rows, label, value) {
  rows.push({ type: "row", label, value });
}


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shouldStopParsing(token) {
  return NOISE_PATTERNS.some((pattern) => pattern.test(token));
}

function isRelatedProductsLabel(label) {
  if (!label) return false;
  if (RELATED_PRODUCTS_LABELS.has(label)) return true;
  return /Նմանատիպ ապրանքներ/.test(label);
}

function truncateRelatedProductRows(rows) {
  const cutIndex = rows.findIndex(
    (row) => row.type !== "status" && isRelatedProductsLabel(row.label),
  );
  return cutIndex >= 0 ? rows.slice(0, cutIndex) : rows;
}

function normalizeSpecSections(specRows) {
  if (specRows.length === 0) return specRows;

  const firstSectionIndex = specRows.findIndex((row) => row.type === "section");
  const leading = firstSectionIndex === -1 ? specRows : specRows.slice(0, firstSectionIndex);
  const rest = firstSectionIndex === -1 ? [] : specRows.slice(firstSectionIndex);
  const hasLeadingRows = leading.some((row) => row.type === "row");

  if (!hasLeadingRows) return specRows;
  if (leading[0]?.type === "section" && leading[0].label === "Ընդհանուր բնութագրեր") {
    return specRows;
  }

  return [{ type: "section", label: "Ընդհանուր բնութագրեր" }, ...leading, ...rest];
}

/**
 * Converts pipe-separated MobileCentre description into structured specs HTML.
 */
function buildDescriptionHtml(raw) {
  if (!raw) return null;

  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const rows = [];
  let i = 0;

  while (i < parts.length) {
    const token = parts[i];
    if (shouldStopParsing(token)) break;
    if (token.startsWith("http")) {
      i++;
      continue;
    }
    if (SECTION_HEADERS.has(token)) {
      rows.push({ type: "section", label: token });
      i++;
      continue;
    }

    const next = parts[i + 1];
    if (next && SECTION_HEADERS.has(next)) {
      if (token.length < 100) rows.push({ type: "status", label: token });
      i++;
      continue;
    }

    if (STATUS_ONLY_TOKENS.has(token)) {
      rows.push({ type: "status", label: token });
      i++;
      continue;
    }

    if (
      next &&
      !shouldStopParsing(next) &&
      !next.startsWith("http") &&
      !SECTION_HEADERS.has(next)
    ) {
      const confidence = pairConfidence(token, next);

      if (confidence === "label-value") {
        pushRow(rows, token, next);
        i += 2;
        continue;
      }

      if (confidence === "value-label") {
        pushRow(rows, next, token);
        i += 2;
        continue;
      }

      if (SPEC_LABELS.has(token) && !SPEC_LABELS.has(next)) {
        pushRow(rows, token, next);
        i += 2;
        continue;
      }

      if (looksLikeValue(token) && looksLikeLabel(next)) {
        pushRow(rows, next, token);
        i += 2;
        continue;
      }

      if (looksLikeLabel(token) && looksLikeValue(next)) {
        pushRow(rows, token, next);
        i += 2;
        continue;
      }

      if (token.length < 100 && next.length < 100) {
        pushRow(rows, token, next);
        i += 2;
        continue;
      }
    }

    if (next && !shouldStopParsing(next) && !next.startsWith("http")) {
      rows.push({ type: "row", label: token, value: next });
      i += 2;
    } else {
      if (token.length < 100) rows.push({ type: "status", label: token });
      i++;
    }
  }

  if (rows.length === 0) return null;

  const statusRows = rows.filter((r) => r.type === "status");
  const specRows = normalizeSpecSections(
    truncateRelatedProductRows(rows.filter((r) => r.type !== "status")),
  );

  let html = "";
  if (statusRows.length > 0) {
    html += `<p class="product-status">${statusRows.map((r) => escapeHtml(r.label)).join(" · ")}</p>`;
  }

  if (specRows.length > 0) {
    html += `<table class="product-specs"><tbody>`;
    for (const row of specRows) {
      if (row.type === "section") {
        const slug = SECTION_SLUGS[row.label] || "other";
        html += `<tr class="specs-section specs-section--${slug}"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">${escapeHtml(row.label)}</span></td></tr>`;
      } else {
        html += `<tr class="spec-row"><td class="spec-label">${escapeHtml(row.label)}</td><td class="spec-value">${escapeHtml(row.value)}</td></tr>`;
      }
    }
    html += `</tbody></table>`;
  }

  return html || null;
}

module.exports = {
  NOISE_PATTERNS,
  SECTION_HEADERS,
  buildDescriptionHtml,
};
