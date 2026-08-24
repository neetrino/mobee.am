#!/usr/bin/env node
"use strict";

const { fetchHtml, stripTags } = require("./http.cjs");
const mc = require("./providers/mobilecentre.cjs");

async function main() {
  const dysonUrl = "https://www.mobilecentre.am/product/dyson-hair-dryer-hd08-supersonic-sg_my_hk_lr_lr_fu/33338/";
  const { text } = await fetchHtml(dysonUrl);
  const pageText = stripTags(text);
  console.log("Dyson HD08 price match:", pageText.match(/([\d,\s]{4,})\s*դր/i));
  console.log("Dyson HD08 title:", text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);

  const parsed = await mc.parseProductPage(dysonUrl, require("./targets.cjs").DEVICE_TARGETS);
  console.log("Dyson parsed:", JSON.stringify(parsed, null, 2));

  const searchUrl = "https://www.mobilecentre.am/search/?searchData=" + encodeURIComponent("PlayStation 5 Slim");
  const { text: searchHtml } = await fetchHtml(searchUrl);
  const links = [...searchHtml.matchAll(/href=["']([^"']*\/product\/[^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((h) => /playstation|ps5|ps-5/i.test(h))
    .slice(0, 15);
  console.log("\nMC PS5 Slim search links:", links);

  for (const href of links.slice(0, 5)) {
    const url = href.startsWith("http") ? href : `https://www.mobilecentre.am${href}`;
    const { text: phtml } = await fetchHtml(url);
    const title = stripTags(phtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const price = stripTags(phtml).match(/([\d,\s]{4,})\s*դր/i);
    console.log({ url, title, price: price?.[1] });
  }
}

main().catch(console.error);
