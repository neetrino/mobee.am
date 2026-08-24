#!/usr/bin/env node
"use strict";

const { fetchHtml } = require("./http.cjs");

async function mcSearch(q) {
  const url = `https://www.mobilecentre.am/search/?searchData=${encodeURIComponent(q)}`;
  const { text } = await fetchHtml(url, { sleepMs: 200 });
  const links = new Set();
  const re = /href=["']([^"']*(?:\/product\/[^"']+|m=prod[^"']+))["']/gi;
  let m;
  while ((m = re.exec(text))) {
    let h = m[1];
    if (h.startsWith("/")) h = `https://www.mobilecentre.am${h}`;
    if (h.includes("mobilecentre.am")) links.add(h.split("#")[0]);
  }
  return [...links].slice(0, 15);
}

async function ymSearch(q) {
  const url = `https://www.yerevanmobile.am/en/catalogsearch/result/?q=${encodeURIComponent(q)}`;
  const { text } = await fetchHtml(url, { sleepMs: 200 });
  const links = new Set();
  const re = /href=["']([^"']*\.html)["']/gi;
  let m;
  while ((m = re.exec(text))) {
    let h = m[1];
    if (h.startsWith("/")) h = `https://www.yerevanmobile.am${h}`;
    if (h.includes("yerevanmobile.am") && !h.includes("catalogsearch")) links.add(h.split("#")[0]);
  }
  return [...links].slice(0, 15);
}

async function main() {
  const queries = [
    "Dyson Supersonic",
    "Dyson hair dryer",
    "Dyson Supersonic Nural",
    "PlayStation 5",
    "PS5 console",
    "Sony PlayStation 5 Pro",
    "PlayStation 4 Slim",
  ];
  for (const q of queries) {
    console.log(`\n=== ${q} ===`);
    try {
      const mc = await mcSearch(q);
      console.log("MC:", mc.length);
      mc.slice(0, 5).forEach((u) => console.log(" ", u));
    } catch (e) {
      console.log("MC err", e.message);
    }
    try {
      const ym = await ymSearch(q);
      console.log("YM:", ym.length);
      ym.slice(0, 5).forEach((u) => console.log(" ", u));
    } catch (e) {
      console.log("YM err", e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
