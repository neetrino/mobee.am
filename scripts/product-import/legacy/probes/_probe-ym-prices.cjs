#!/usr/bin/env node
"use strict";

const { fetchHtml, stripTags } = require("./http.cjs");

const URLS = [
  "https://www.yerevanmobile.am/en/sony-ps5-digital-825gb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-1tb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-eu.html",
  "https://www.yerevanmobile.am/en/sony-ps5-pro.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-fifa-26.html",
  "https://www.mobilecentre.am/product/sony-playstation-5-slim-white/33983/",
  "https://www.mobilecentre.am/product/dyson-hair-dryer-hd08-supersonic-sg_my_hk_lr_lr_fu/33338/",
];

function parseTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1b ? stripTags(h1b[1]) : null;
}

function extractProductInfoBlock(html) {
  const markers = [
    'class="product-info-main"',
    'class="product-info-price"',
    'data-product-id=',
    'product-info-main',
  ];
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx >= 0) return html.slice(idx, idx + 80000);
  }
  const h1Idx = html.search(/<h1[^>]*class="[^"]*page-title/i);
  if (h1Idx >= 0) return html.slice(h1Idx, h1Idx + 80000);
  return html.slice(0, 120000);
}

function allPrices(html) {
  return [...html.matchAll(/data-price-amount="(\d+)"/g)].map((m) => parseInt(m[1], 10));
}

function pricesInBlock(block) {
  return [...block.matchAll(/data-price-amount="(\d+)"/g)].map((m) => parseInt(m[1], 10));
}

function jsonLdPrice(html) {
  const match = html.match(/"price"\s*:\s*"?(\d+)"?/);
  return match ? parseInt(match[1], 10) : null;
}

function metaPrice(html) {
  const match = html.match(/property="product:price:amount"\s+content="(\d+)"/i);
  return match ? parseInt(match[1], 10) : null;
}

function spanPrice(html) {
  const match = html.match(/class="[^"]*price[^"]*"[^>]*>\s*([\d\s,]+)\s*֏/i);
  if (!match) return null;
  const val = match[1].replace(/[^\d]/g, "");
  return val ? parseInt(val, 10) : null;
}

async function probe(url) {
  const { text } = await fetchHtml(url, { sleepMs: 200 });
  const title = parseTitle(text);
  const block = extractProductInfoBlock(text);
  const report = {
    url,
    title,
    allPrices: allPrices(text).sort((a, b) => a - b),
    blockPrices: pricesInBlock(block).sort((a, b) => a - b),
    jsonLdPrice: jsonLdPrice(text),
    metaPrice: metaPrice(text),
    spanPrice: spanPrice(text),
    blockSnippet: stripTags(block).slice(0, 300),
  };
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  for (const url of URLS) {
    try {
      await probe(url);
    } catch (error) {
      console.log(JSON.stringify({ url, error: error.message }));
    }
  }
}

main();
