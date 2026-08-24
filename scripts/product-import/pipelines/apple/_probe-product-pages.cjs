#!/usr/bin/env node
"use strict";

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      Accept: "text/html",
      "Accept-Language": "en,hy;q=0.9",
    },
    redirect: "follow",
  });
  return { status: r.status, text: await r.text(), url: r.url };
}

(async () => {
  const pages = [
    ["ispace-product", "https://ispace.am/en/product/ipad-air-11-m4-128-gb-wi-fi-2026-starlight-mh334qa-a"],
    ["ym-iphone16e", "https://www.yerevanmobile.am/en/apple-iphone-16e.html"],
    ["mc-imac", "https://www.mobilecentre.am/product/apple-imac-24-inch_apple-m4-chip-with-8-core-cpu-and-8-core-gpu_16gb_256gb-ssd-retina-4.5k-display-_mwue3_-green/31457/"],
  ];
  for (const [label, url] of pages) {
    const { text } = await fetchText(url);
    console.log("\n====", label, "len", text.length);
    const priceMatches = [...text.matchAll(/(?:price|Price|AMD|֏|դր)[^<]{0,80}/gi)].slice(0, 8);
    console.log("price hints:", priceMatches.map((m) => m[0].replace(/\s+/g, " ").slice(0, 80)).join(" | "));
    const imgs = [...text.matchAll(/(?:src|data-src|content)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)]
      .map((m) => m[1])
      .filter((u) => /product|upload|media|cdn|ispace|mobilecentre|yerevanmobile/i.test(u))
      .slice(0, 6);
    console.log("images:", imgs.join("\n  "));
    const sku = text.match(/SKU[^<]{0,120}/i);
    if (sku) console.log("sku:", sku[0].replace(/\s+/g, " ").slice(0, 120));
    const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) console.log("h1:", h1[1].replace(/<[^>]+>/g, "").trim().slice(0, 120));
  }
})();
