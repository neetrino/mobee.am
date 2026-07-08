"use strict";
const { fetchHtml, stripTags } = require("../apple/http.cjs");

async function check(url) {
  const { text, status } = await fetchHtml(url, { sleepMs: 100 });
  const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? stripTags(h1[1]) : "NO H1";
  const prices = [...text.matchAll(/data-price-amount="(\d+)"/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n > 0);
  const links = [...text.matchAll(/href=["']([^"']*(?:samsung|galaxy)[^"']*\.html)["']/gi)]
    .map((m) => m[1])
    .slice(0, 8);
  console.log("URL:", url);
  console.log("  status:", status, "len:", text.length);
  console.log("  title:", title.slice(0, 100));
  console.log("  prices:", [...new Set(prices)].sort((a, b) => a - b).slice(0, 10));
  console.log("  links:", links);
  console.log("");
}

async function inspect(url) {
  const { text } = await fetchHtml(url, { sleepMs: 100 });
  const idx = text.indexOf("product-info-price");
  console.log(text.slice(idx, idx + 2500));
  const labels = [...text.matchAll(/data-option-label="([^"]+)"/g)].slice(0, 20).map((m) => m[1]);
  console.log("labels:", labels);
}

async function main() {
  if (process.argv[2] === "--inspect") {
    await inspect(process.argv[3]);
    return;
  }
  const urls = process.argv.slice(2);
  for (const u of urls) await check(u);
}

main();
