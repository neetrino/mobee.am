#!/usr/bin/env node
"use strict";
fetch("https://www.yerevanmobile.am/en/apple-iphone-16e.html", { headers: { "User-Agent": "Mozilla/5.0" } })
  .then((r) => r.text())
  .then((t) => {
    const amounts = [...t.matchAll(/data-price-amount=\"(\d+)\"/g)].map((m) => m[1]);
    console.log("data-price-amount:", amounts);
    const final = [...t.matchAll(/\"finalPrice\"\s*:\s*\{\s*\"amount\"\s*:\s*(\d+)/g)].map((m) => m[1]);
    console.log("finalPrice amounts:", final);
    const old = [...t.matchAll(/\"oldPrice\"\s*:\s*\{\s*\"amount\"\s*:\s*(\d+)/g)].map((m) => m[1]);
    console.log("oldPrice amounts:", old);
    const stock = t.match(/\"stockStatus\"\s*:\s*\"([^\"]+)\"/);
    console.log("stockStatus:", stock?.[1]);
    const instock = /In stock|Առկա|available/i.test(t);
    console.log("in stock text:", instock);
  });
