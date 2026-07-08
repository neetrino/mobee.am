"use strict";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDescriptionIntro(html) {
  const match = html.match(
    /<div class="product attribute description">\s*<div class="value"\s*>([\s\S]*?)<\/div>\s*<\/div>/i,
  );
  if (!match) return "";
  return stripTags(match[1]);
}

function extractAdditionalBlocks(html) {
  const sectionMatch = html.match(
    /<div class="tab_block additional[\s\S]*?<div class="additional">([\s\S]*?)<\/div>\s*<\/div>/i,
  );
  if (!sectionMatch) return [];

  const chunk = sectionMatch[1];
  const blocks = [];
  const blockRe = /<div class="details_block">\s*<div class="sub_title">([\s\S]*?)<\/div>\s*<table>([\s\S]*?)<\/table>/gi;
  let blockMatch;
  while ((blockMatch = blockRe.exec(chunk))) {
    const title = stripTags(blockMatch[1]);
    const rows = [];
    const rowRe = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(blockMatch[2]))) {
      const label = stripTags(rowMatch[1]);
      const value = stripTags(rowMatch[2]);
      if (label && value) rows.push({ label, value });
    }
    if (title && rows.length) blocks.push({ title, rows });
  }
  return blocks;
}

function renderDescriptionHtml(blocks, intro) {
  const rows = [];
  if (intro) rows.push({ type: "status", label: intro });

  for (const block of blocks) {
    rows.push({ type: "section", label: block.title });
    for (const row of block.rows) {
      rows.push({ type: "row", label: row.label, value: row.value });
    }
  }

  if (!rows.some((row) => row.type === "row")) return null;

  let html = "";
  html += `<table class="product-specs"><tbody>`;
  for (const row of rows) {
    if (row.type === "section") {
      const slug = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      html += `<tr class="specs-section specs-section--${slug}"><td colspan="2"><span class="specs-section-icon" aria-hidden="true"></span><span class="specs-section-title">${escapeHtml(row.label)}</span></td></tr>`;
    } else if (row.type === "row") {
      html += `<tr class="spec-row"><td class="spec-label">${escapeHtml(row.label)}</td><td class="spec-value">${escapeHtml(row.value)}</td></tr>`;
    }
  }
  html += `</tbody></table>`;
  return html;
}

function parseYerevanMobileDescriptionHtml(html) {
  if (!html) return null;
  const intro = extractDescriptionIntro(html);
  const blocks = extractAdditionalBlocks(html);
  return renderDescriptionHtml(blocks, intro);
}

module.exports = {
  parseYerevanMobileDescriptionHtml,
  extractDescriptionIntro,
  extractAdditionalBlocks,
};
