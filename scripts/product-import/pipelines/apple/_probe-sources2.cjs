#!/usr/bin/env node
"use strict";

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      "Accept-Language": "en,hy;q=0.9",
    },
  });
  return { status: r.status, text: await r.text(), url: r.url };
}

(async () => {
  const tests = [
    "https://ispace.am/en/category/ipad-air-m4",
    "https://ispace.am/en/category/imac",
    "https://ispace.am/en/category/mac-mini",
    "https://yerevanmobile.am/am/apple-iphone-16e.html",
    "https://yerevanmobile.am/en/apple-iphone-16e.html",
    "https://yerevanmobile.am/am/search/?q=iPhone+16e",
    "https://www.mobilecentre.am/search/?searchData=iPhone+16e",
    "https://www.mobilecentre.am/search/?searchData=iMac",
  ];

  for (const url of tests) {
    const { status, text, url: finalUrl } = await fetchText(url);
    console.log("\n===", url, "->", status, "final:", finalUrl, "len:", text.length);
    const nuxt = text.match(/window\.__NUXT__=([\s\S]*?)<\/script>/);
    if (nuxt) console.log("NUXT payload size:", nuxt[1].length);
    const title = (text.match(/<title[^>]*>([^<]+)/i) || [])[1];
    if (title) console.log("title:", title.trim());
    if (text.length < 500) console.log("body:", text.slice(0, 300));
    const productLinks = [...text.matchAll(/https?:\/\/ispace\.am\/en\/product\/[^"'\s]+/g)].slice(0, 5);
    if (productLinks.length) console.log("ispace products:", productLinks.map((m) => m[0]).join(" | "));
    const ym = [...text.matchAll(/href=["']([^"']*apple[^"']*\.html)["']/gi)].slice(0, 5);
    if (ym.length) console.log("ym links:", ym.map((m) => m[1]).join(" | "));
    const mc = [...text.matchAll(/href=["']([^"']*\/product\/[^"']+)["']/gi)].slice(0, 5);
    if (mc.length) console.log("mc links:", mc.map((m) => m[1]).join(" | "));
  }
})();
