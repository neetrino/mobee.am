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
  "Ընդհանուր բնութագրեր",
  "Հիշողություն և Պրոցեսոր",
  "Ցանց",
  "Սնուցում",
  "Այլ",
  "Տեսախցիկներ",
  "Էկրան",
]);

const SECTION_SLUGS = {
  "Ընդհանուր բնութագրեր": "general",
  "Էկրան": "screen",
  "Տեսախցիկներ": "cameras",
  "Հիշողություն և Պրոցեսոր": "memory",
  "Ցանց": "network",
  "Սնուցում": "power",
  "Այլ": "other",
};

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
        html += `<tr class="specs-section specs-section--${slug}"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span>${escapeHtml(row.label)}</td></tr>`;
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
