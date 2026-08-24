#!/usr/bin/env node
/**
 * Read-only: compare mobilecentre_apple_variable_products.json vs whitelists.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JSON_FILE = path.join(ROOT, "data/product-import/apple/mobilecentre_apple_variable_products.json");

// From whitelist.constants.ts
const TS_WHITELIST = [
  "iPhone 16e", "iPhone 17", "iPhone Air", "iPhone 17 Pro", "iPhone 17 Pro Max",
  "iPhone 17e", "iPhone 18", "iPhone 18 Air", "iPhone 18 Pro", "iPhone 18 Pro Max",
  "MacBook Air 13-inch M4", "MacBook Air 15-inch M4", "MacBook Air 13-inch M5", "MacBook Air 15-inch M5",
  "MacBook Pro 14-inch M5", "MacBook Pro 14-inch M5 Pro", "MacBook Pro 14-inch M5 Max",
  "MacBook Pro 16-inch M5 Pro", "MacBook Pro 16-inch M5 Max",
  "Mac Studio 2025", "Mac mini M5", "Mac Studio M5", "MacBook Neo",
  "Studio Display 2026", "Studio Display XDR",
  "iPad 11th Gen (A16)", "iPad Air 11 M3", "iPad Air 13 M3", "iPad Air 11 M4", "iPad Air 13 M4",
  "iPad Pro 11 M5", "iPad Pro 13 M5", "iPad mini", "iPad mini OLED", "iPad A18",
  "Apple Watch SE 3", "Apple Watch Series 11", "Apple Watch Ultra 3",
  "Apple Watch Series 12", "Apple Watch Ultra 4",
  "AirPods Pro 3", "AirPods Max 2", "AirPods Ultra",
  "Apple Vision Pro M5", "Apple TV 4K A17 Pro",
  "HomePod 3", "HomePod mini 2", "HomePad",
  "Apple Security Camera", "Apple Video Doorbell",
  "Magic Keyboard for iPad Air", "MagSafe Battery", "MagSafe Charger 25W Qi2", "AirTag 2",
];

const DASH_CHARS = /[\u2010\u2011\u2012\u2013\u2014\u2212]/g;
const TRAILING_SKU = /\s+(?:\([A-Z0-9]*\d[A-Z0-9]{1,9}\)|[A-Z]{1,3}\d[A-Z0-9]{2,6}(?:\/[A-Z]+)?)\s*$/g;
const ACCESSORY_REMAINDER = /^(bumper|case|band|strap|keyboard|charger|cable|adapter|reader|cover|folio|pouch|screen protector)\b/i;

function extractBaseProductName(raw) {
  return (raw || "")
    .replace(/^Mobile\s+Centre\.\s*-\s*/i, "")
    .replace(/^A\.\s+/i, "")
    .replace(/\(\.A\)\s*/g, "")
    .replace(DASH_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInchTokens(value) {
  return value
    .replace(/(\d+(?:\.\d+)?)\s*-?\s*(?:inch|in\.?)\b/gi, (_, size) => {
      const n = Number.parseFloat(size);
      return `${Number.isFinite(n) ? Math.floor(n) : size}-inch`;
    })
    .replace(/(\d+)\.\d+-inch/g, (_, size) => `${size}-inch`);
}

function normalizeIpadAirTitle(value) {
  return value.replace(/\bipad\s+(\d{1,2})\s+air\s+(m\d+)\b/gi, "iPad Air $1 $2");
}

function normalizeProductName(name) {
  let value = extractBaseProductName(name)
    .replace(/^Apple\s+/i, "")
    .replace(/\s*\/\s*Apple\s+/gi, " ")
    .replace(/\s+Apple\s+(?=(?:M\d|[A]\d{1,2}\b))/gi, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(TRAILING_SKU, "");
  value = normalizeInchTokens(value);
  value = normalizeIpadAirTitle(value);
  value = (value.split("/")[0] || value).trim();
  return value.replace(DASH_CHARS, "-").replace(/\s+/g, " ").trim().toLowerCase();
}

const tsMap = new Map(TS_WHITELIST.map((n) => [normalizeProductName(n), n]));
const tsByLength = [...TS_WHITELIST].sort(
  (a, b) => normalizeProductName(b).length - normalizeProductName(a).length
);

function hasSafePrefixBoundary(normTitle, normEntry) {
  if (normTitle === normEntry) return true;
  if (normTitle.startsWith(`${normEntry}/`)) return true;
  if (!normTitle.startsWith(`${normEntry} `)) return false;
  return !ACCESSORY_REMAINDER.test(normTitle.slice(normEntry.length + 1));
}

function classifyTs(title) {
  const norm = normalizeProductName(title);
  const exact = tsMap.get(norm);
  if (exact) return { result: "keep", matched: exact, reason: "exact" };

  for (const entry of tsByLength) {
    const normEntry = normalizeProductName(entry);
    if (hasSafePrefixBoundary(norm, normEntry)) {
      return { result: "keep", matched: entry, reason: "prefix" };
    }
  }
  return { result: "delete", matched: null, reason: "no_match" };
}

const OLD_PATTERNS = [
  { label: "iPhone 13", re: /\biphone\s*13\b/i },
  { label: "iPhone 14", re: /\biphone\s*14\b/i },
  { label: "iPhone 15", re: /\biphone\s*15\b/i },
  { label: "iPhone 16 (not 16e)", re: /\biphone\s*16\b(?!e)/i },
  { label: "MacBook M1", re: /\bm1\b/i },
  { label: "MacBook M2", re: /\bm2\b/i },
  { label: "MacBook M3 (not in whitelist iPad)", re: /\bmacbook\b.*\bm3\b/i },
  { label: "Watch Series 7-10", re: /watch\s*series\s*(7|8|9|10)\b/i },
  { label: "Watch SE (not SE 3)", re: /watch\s*se\b(?!.*\b3\b)/i },
  { label: "AirTag 1", re: /\bairtag\s*1\b/i },
  { label: "Accessory junk", re: /(case|cover|charger|cable|adapter|folio|screen protector|tempered glass|magsafe case)/i },
];

function main() {
  const groups = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  const allVariants = groups.flatMap((g) => (g.variants || []).map((v) => ({ ...v, parentModel: g.model, parentName: g.name })));

  console.log("=== JSON COUNTS ===");
  console.log("Parent groups:", groups.length);
  console.log("Variants:", allVariants.length);

  console.log("\n=== PARENT MODELS (JSON) ===");
  for (const g of groups) {
    const vc = (g.variants || []).length;
    console.log(`- ${g.model || g.name} (${g.category || "?"}) variants=${vc}`);
  }

  console.log("\n=== TYPESCRIPT WHITELIST MATCH (per parent) ===");
  const matched = [];
  const suspicious = [];
  for (const g of groups) {
    const title = g.model || g.name || "";
    const cls = classifyTs(title);
    const line = `${title} => ${cls.result}${cls.matched ? ` [${cls.matched}]` : ""} (${cls.reason})`;
    if (cls.result === "keep") matched.push(line);
    else suspicious.push(line);
    console.log(line);
  }

  console.log("\n=== OLD / JUNK SCAN (parents + variant names) ===");
  const hits = [];
  for (const g of groups) {
    const texts = [g.model, g.name, ...(g.variants || []).map((v) => v.name)];
    for (const t of texts) {
      if (!t) continue;
      for (const p of OLD_PATTERNS) {
        if (p.re.test(t)) hits.push({ pattern: p.label, text: t });
      }
    }
  }
  if (!hits.length) console.log("None found.");
  else for (const h of hits) console.log(`- [${h.pattern}] ${h.text}`);

  console.log("\n=== VARIANT QUALITY ===");
  const noPid = allVariants.filter((v) => !v.source_pid);
  const noPrice = allVariants.filter((v) => !v.price);
  const noImage = allVariants.filter((v) => !v.image_url && !(v.gallery && v.gallery.length));
  const noOptions = allVariants.filter((v) => !v.options || !Object.keys(v.options).length);
  console.log("without source_pid:", noPid.length);
  console.log("without price:", noPrice.length);
  console.log("without image/gallery:", noImage.length);
  console.log("without any options:", noOptions.length);
  if (noPid.length) console.log("  pids:", noPid.map((v) => v.name).slice(0, 5));
  if (noImage.length) console.log("  no image:", noImage.map((v) => v.name).slice(0, 5));

  console.log("\n=== OPTION KEYS IN JSON ===");
  const optionKeys = new Set();
  const optionCounts = { color: 0, storage: 0, sim: 0, other: {} };
  for (const v of allVariants) {
    const opts = v.options || {};
    for (const [k, val] of Object.entries(opts)) {
      optionKeys.add(k);
      if (k === "color" || k === "storage" || k === "sim") {
        if (val) optionCounts[k]++;
      } else if (val) {
        optionCounts.other[k] = (optionCounts.other[k] || 0) + 1;
      }
    }
  }
  console.log("All keys:", [...optionKeys].sort().join(", ") || "(none)");
  console.log("color filled:", optionCounts.color);
  console.log("storage filled:", optionCounts.storage);
  console.log("sim filled:", optionCounts.sim);
  if (Object.keys(optionCounts.other).length) {
    console.log("other keys:", optionCounts.other);
  }

  console.log("\n=== PYTHON vs TS WHITELIST DIFF ===");
  const pyFile = fs.readFileSync(path.join(ROOT, "scripts/product-import/sources/mobilecentre/filter-mobilecentre-whitelist.py"), "utf8");
  const pyHas16e = pyFile.includes("iphone\\s*16e");
  const pyHas18 = pyFile.includes("iphone\\s*18");
  const pyHasAirTag2 = pyFile.includes("airtag\\s*2");
  const tsHas16e = TS_WHITELIST.includes("iPhone 16e");
  const tsHas18 = TS_WHITELIST.some((x) => x.startsWith("iPhone 18"));
  const tsHasAirTag2 = TS_WHITELIST.includes("AirTag 2");
  console.log("iPhone 16e: Python filter", pyHas16e ? "yes" : "no", "| TS whitelist", tsHas16e ? "yes" : "no");
  console.log("iPhone 18*: Python filter", pyHas18 ? "yes" : "no", "| TS whitelist", tsHas18 ? "yes" : "no");
  console.log("AirTag 2: Python filter", pyHasAirTag2 ? "yes" : "no", "| TS whitelist", tsHasAirTag2 ? "yes" : "no");
  console.log("Python uses regex patterns on scraped names; TS uses normalized title matching.");
  console.log("TS entries not on MobileCentre may be absent from JSON even if whitelisted.");

  console.log("\n=== SUMMARY ===");
  console.log("TS matched parents:", matched.length);
  console.log("TS suspicious parents:", suspicious.length);
}

main();
