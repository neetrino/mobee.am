"use strict";

/** Missing / unresolved Apple targets from DB audit (import if found on approved sources). */
const IMPORT_TARGETS = [
  { category: "iPhone 2025", year: "2025", model: "iPhone 16e" },
  { category: "Mac / MacBook Air", year: "", model: "MacBook Air 15-inch M4" },
  { category: "Mac / Desktop", year: "", model: "iMac" },
  { category: "Mac / Desktop", year: "", model: "Mac mini M5" },
  { category: "Mac / Desktop", year: "2025", model: "Mac Studio 2025" },
  { category: "Mac / Desktop", year: "", model: "Mac Studio M5" },
  { category: "Mac / MacBook Pro", year: "", model: "MacBook Pro 14-inch M5 Max" },
  { category: "Mac / MacBook Pro", year: "", model: "MacBook Pro 16-inch M5 Max" },
  { category: "iPad 2025", year: "2025", model: "iPad 11th Gen A16" },
  { category: "iPad 2025", year: "2025", model: "iPad Air 11 M3" },
  { category: "iPad 2025", year: "2025", model: "iPad Air 13 M3" },
  { category: "iPad 2026", year: "2026", model: "iPad Air 11 M4" },
  { category: "iPad 2026", year: "2026", model: "iPad Air 13 M4" },
  { category: "iPad 2025", year: "2025", model: "iPad Pro 11 M5" },
  { category: "iPad 2025", year: "2025", model: "iPad Pro 13 M5" },
  { category: "iPad 2026", year: "2026", model: "iPad A18" },
  { category: "iPad 2026", year: "2026", model: "iPad mini OLED" },
  { category: "Apple Watch 2026", year: "2026", model: "Apple Watch Series 12" },
  { category: "Apple Watch 2026", year: "2026", model: "Apple Watch Ultra 4" },
  { category: "AirPods 2026", year: "2026", model: "AirPods Max 2" },
  { category: "AirPods 2026", year: "2026", model: "AirPods Ultra" },
  { category: "Vision", year: "", model: "Apple Vision Pro M5" },
  { category: "Home & TV 2026", year: "2026", model: "Apple TV 4K A17 Pro" },
  { category: "Home & TV 2026", year: "2026", model: "HomePod 3" },
  { category: "Home & TV 2026", year: "2026", model: "HomePod mini 2" },
  { category: "Home & TV 2026", year: "2026", model: "HomePad" },
  { category: "Home & TV 2026", year: "2026", model: "Apple Security Camera" },
  { category: "Home & TV 2026", year: "2026", model: "Apple Video Doorbell" },
  { category: "Accessories 2025", year: "2025", model: "Magic Keyboard for iPad Air" },
  { category: "Accessories 2025", year: "2025", model: "MagSafe Battery" },
  { category: "Accessories 2025", year: "2025", model: "MagSafe Charger 25W Qi2" },
  { category: "Accessories 2026", year: "2026", model: "AirTag 2" },
  { category: "Accessories 2026", year: "2026", model: "Studio Display 2026" },
  { category: "Accessories 2026", year: "2026", model: "Studio Display XDR" },
];

function buildSearchQueries(target) {
  const model = target.model.trim();
  const queries = [model, `Apple ${model}`];
  const extras = {
    "iPhone 16e": ["iPhone 16 e", "Apple iPhone 16e"],
    "iPad 11th Gen A16": ["iPad A16", "iPad 11 A16", "Apple iPad 10"],
    "iPad Air 11 M3": ["iPad Air 11", "iPad Air 11 M3 2024"],
    "iPad Air 13 M3": ["iPad Air 13", "iPad Air 13 M3 2024"],
    "iPad Air 11 M4": ["iPad Air 11 M4", "Apple iPad 11 Air M4", "iPad 11 Air M4"],
    "iPad Air 13 M4": ["iPad Air 13 M4", "Apple iPad 13 Air M4"],
    "iPad Pro 11 M5": ["iPad Pro 11 M5", "iPad Pro 11 inch M5"],
    "iPad Pro 13 M5": ["iPad Pro 13 M5", "iPad Pro 13 inch M5"],
    "iPad mini OLED": ["iPad mini", "iPad mini 7"],
    "MacBook Air 15-inch M4": ["MacBook Air 15 M4", "MacBook Air 15 inch M4"],
    "MacBook Pro 14-inch M5 Max": ["MacBook Pro 14 M5 Max", "MacBook Pro 14.2 M5 Max"],
    "MacBook Pro 16-inch M5 Max": ["MacBook Pro 16 M5 Max", "MacBook Pro 16.2 M5 Max"],
    "Mac mini M5": ["Mac mini M5", "Apple Mac mini M5"],
    "Mac Studio M5": ["Mac Studio M5", "Apple Mac Studio M5"],
    "Mac Studio 2025": ["Mac Studio 2025", "Mac Studio M4 Max"],
    "MagSafe Charger 25W Qi2": ["MagSafe Charger 25W", "Apple MagSafe Charger Qi2"],
    "Magic Keyboard for iPad Air": ["Magic Keyboard iPad Air", "Apple Magic Keyboard iPad Air"],
    "Apple TV 4K A17 Pro": ["Apple TV 4K", "Apple TV A17 Pro"],
  };
  if (extras[model]) queries.push(...extras[model]);
  return [...new Set(queries.filter(Boolean))];
}

function writeTargetsTsv(filePath, fs) {
  const lines = IMPORT_TARGETS.map((t) =>
    [t.category, t.year, t.model, "", "", "", "", "", "", "", "", "", ""].join("\t")
  );
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

/** iSpace category pages for discovery (not exhaustive). */
const ISPACE_CATEGORY_URLS = [
  "https://ispace.am/en/category/iphone-16",
  "https://ispace.am/en/category/iphone-17",
  "https://ispace.am/en/category/ipad",
  "https://ispace.am/en/category/ipad-air",
  "https://ispace.am/en/category/ipad-air-m4",
  "https://ispace.am/en/category/ipad-pro",
  "https://ispace.am/en/category/ipad-mini",
  "https://ispace.am/en/category/macbook-air",
  "https://ispace.am/en/category/macbook-pro",
  "https://ispace.am/en/category/macbook-pro-m5",
  "https://ispace.am/en/category/macbook-pro-m5-pro-max",
  "https://ispace.am/en/category/imac",
  "https://ispace.am/en/category/mac-mini",
  "https://ispace.am/en/category/mac-studio",
  "https://ispace.am/en/category/watch",
  "https://ispace.am/en/category/airpods",
  "https://ispace.am/en/category/apple-tv",
  "https://ispace.am/en/category/homepod",
  "https://ispace.am/en/category/studio-display",
  "https://ispace.am/en/category/accessories",
];

/** YerevanMobile Apple listing pages. */
const YEREVANMOBILE_CATEGORY_URLS = [
  "https://www.yerevanmobile.am/en/phones/apple.html",
  "https://www.yerevanmobile.am/en/electronics/tablets/apple.html",
  "https://www.yerevanmobile.am/en/notebooks/apple.html",
  "https://www.yerevanmobile.am/en/electronics/watches/apple.html",
  "https://www.yerevanmobile.am/en/electronics/headphones/apple.html",
  "https://www.yerevanmobile.am/en/electronics/apple-tv.html",
  "https://www.yerevanmobile.am/en/accessories/apple.html",
];

module.exports = {
  IMPORT_TARGETS,
  ISPACE_CATEGORY_URLS,
  YEREVANMOBILE_CATEGORY_URLS,
  buildSearchQueries,
  writeTargetsTsv,
};
