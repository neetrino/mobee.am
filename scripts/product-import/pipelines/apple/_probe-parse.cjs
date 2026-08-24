#!/usr/bin/env node
"use strict";
const { parseProductPage } = require("./providers/yerevanmobile.cjs");
const { parseProductPage: parseIspace } = require("./providers/ispace.cjs");

(async () => {
  const ym = await parseProductPage("https://www.yerevanmobile.am/en/apple-iphone-16e.html");
  console.log("YM iPhone 16e variants:", ym?.length, ym?.slice(0, 2));
  const is = await parseIspace("https://ispace.am/en/product/ipad-air-11-m4-128-gb-wi-fi-2026-starlight-mh334qa-a");
  console.log("iSpace iPad Air price:", is?.price, is?.name);
  const im = await parseIspace("https://ispace.am/en/product/imac-24-retina-45k-apple-m4-16-gb-512-gb-ssd-mwv33rua");
  console.log("iSpace iMac price:", im?.price, im?.name);
})();
