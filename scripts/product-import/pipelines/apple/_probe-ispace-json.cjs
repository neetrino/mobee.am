#!/usr/bin/env node
"use strict";
const fs = require("fs");

async function main() {
  const url = process.argv[2] || "https://ispace.am/en/product/ipad-air-11-m4-128-gb-wi-fi-2026-starlight-mh334qa-a";
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const text = await r.text();
  const ld = [...text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  console.log("ld+json blocks:", ld.length);
  for (const m of ld.slice(0, 3)) {
    try {
      const j = JSON.parse(m[1]);
      console.log(JSON.stringify(j, null, 2).slice(0, 2000));
    } catch (e) {
      console.log("parse err", e.message);
    }
  }
  const og = [...text.matchAll(/property="og:([^"]+)" content="([^"]+)"/g)].slice(0, 10);
  console.log("og:", og.map((m) => `${m[1]}=${m[2].slice(0, 80)}`).join("\n"));
  fs.writeFileSync("scripts/product-import/pipelines/apple/_sample-ispace.html", text.slice(0, 500000));
  console.log("saved sample html");
}

main();
