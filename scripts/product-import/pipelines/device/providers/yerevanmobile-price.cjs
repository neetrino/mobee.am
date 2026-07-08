"use strict";

const { fetchHtml, stripTags } = require("../http.cjs");

function extractProductInfoBlock(html) {
  const idx = html.indexOf('class="product-info-main"');
  if (idx >= 0) {
    const endMarkers = ['block upsell', 'block related', 'products-related', 'catalog.product.related'];
    let end = html.length;
    for (const marker of endMarkers) {
      const pos = html.indexOf(marker, idx + 100);
      if (pos > idx && pos < end) end = pos;
    }
    return html.slice(idx, end);
  }
  const h1Idx = html.search(/<h1[^>]*class="[^"]*page-title/i);
  if (h1Idx >= 0) return html.slice(h1Idx, h1Idx + 60000);
  return html.slice(0, 120000);
}

function parseMainProductPrice(html) {
  const metaMatch = html.match(/property="product:price:amount"\s+content="(\d+)"/i);
  if (metaMatch) return parseInt(metaMatch[1], 10);

  const block = extractProductInfoBlock(html);

  const cashMatch =
    block.match(/Cash\s*֏\s*([\d\s,]+)/i) ||
    block.match(/Cash\s*([\d\s,]+)\s*֏/i);
  if (cashMatch) {
    const value = cashMatch[1].replace(/[^\d]/g, "");
    if (value) return parseInt(value, 10);
  }

  const spanMatch = block.match(/class="[^"]*price[^"]*"[^>]*>\s*<!--\s*-->\s*֏\s*([\d\s,]+)/i);
  if (spanMatch) {
    const value = spanMatch[1].replace(/[^\d]/g, "");
    if (value) return parseInt(value, 10);
  }

  const blockPrices = [...block.matchAll(/data-price-amount="(\d+)"/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n >= 50000);
  if (blockPrices.length) return Math.max(...blockPrices);

  return null;
}

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1b ? stripTags(h1b[1]) : null;
}

module.exports = {
  extractProductInfoBlock,
  parseMainProductPrice,
  parseTitle,
};
