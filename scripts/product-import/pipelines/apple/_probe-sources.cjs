#!/usr/bin/env node
"use strict";
const urls = [
  "https://ispace.am/en/search?q=iPhone+16e",
  "https://ispace.am/en/category/ipad-air-m4",
  "https://yerevanmobile.am/am/catalogsearch/result/?q=iPhone+16e",
  "https://www.mobilecentre.am/index.php?m=search&keyword=iPhone+16e",
];

(async () => {
  for (const u of urls) {
    const r = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en,hy;q=0.9" },
    });
    const t = await r.text();
    console.log("\n===", u, "status", r.status, "len", t.length);
    const re = /href=["']([^"']*(?:product|iphone|ipad|macbook|apple|catalog)[^"']*)["']/gi;
    const links = [];
    let m;
    while ((m = re.exec(t)) && links.length < 12) links.push(m[1]);
    console.log(links.join("\n  "));
  }
})();
