#!/usr/bin/env node
"use strict";

async function main() {
  const url = "https://www.yerevanmobile.am/en/apple-iphone-16e.html";
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const text = await r.text();
  const cfg = text.match(/"jsonConfig"\s*:\s*(\{[\s\S]*?\})\s*,\s*"jsonSwatchConfig"/);
  if (cfg) console.log("jsonConfig snippet:", cfg[1].slice(0, 1500));
  const price = text.match(/"finalPrice"\s*:\s*\{[^}]+\}/);
  console.log("finalPrice:", price?.[0]);
  const sp = text.match(/"spConfig"\s*:\s*(\{[\s\S]{0,2000})/);
  console.log("spConfig:", sp?.[1]?.slice(0, 800));
  const sku = text.match(/itemprop="sku"[^>]*content="([^"]+)"/i);
  console.log("sku itemprop:", sku?.[1]);
  const imgs = [...text.matchAll(/"full"\s*:\s*"([^"]+catalog\/product[^"]+)"/g)].slice(0, 8);
  console.log("gallery:", imgs.map((m) => m[1]).join("\n"));
}

main();
