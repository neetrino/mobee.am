#!/usr/bin/env node
"use strict";
fetch("https://www.yerevanmobile.am/en/apple-iphone-16e.html", { headers: { "User-Agent": "Mozilla/5.0" } })
  .then((r) => r.text())
  .then((t) => {
    const sw = [...t.matchAll(/data-option-label=\"([^\"]+)\"[^>]*data-price-amount=\"(\d+)\"/g)];
    console.log("swatches", sw.length, sw.slice(0, 5));
    const amt = [...t.matchAll(/data-price-amount=\"(\d+)\"/g)].map((m) => m[1]);
    console.log("amounts", amt.slice(0, 15));
    const final = t.match(/\"price\"\s*:\s*(\d+)/);
    console.log("price json", final?.[1]);
  });
