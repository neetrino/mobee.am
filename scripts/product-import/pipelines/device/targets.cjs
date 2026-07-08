"use strict";

const DYSON_HAIR_DRYER_PARENT_MODELS = [
  "Dyson Supersonic",
  "Dyson Supersonic Nural",
  "Dyson Supersonic r",
  "Dyson Supersonic Travel",
];

const PLAYSTATION_CONSOLE_PARENT_MODELS = [
  "Sony PlayStation 4",
  "Sony PlayStation 4 Slim",
  "Sony PlayStation 4 Pro",
  "Sony PlayStation 5",
  "Sony PlayStation 5 Digital Edition",
  "Sony PlayStation 5 Slim",
  "Sony PlayStation 5 Slim Digital Edition",
  "Sony PlayStation 5 Pro",
];

const DEVICE_TARGETS = [
  ...DYSON_HAIR_DRYER_PARENT_MODELS.map((model) => ({
    type: "dyson",
    model,
    category: "Hair Dryers",
  })),
  ...PLAYSTATION_CONSOLE_PARENT_MODELS.map((model) => ({
    type: "playstation",
    model,
    category: "Game Consoles",
  })),
];

const DYSON_HARD_REJECT_KEYWORDS = [
  "airwrap",
  "airstrait",
  "corrale",
  "v15",
  "v12",
  "v11",
  "v10",
  "gen5",
  "big ball",
  "purifier",
  "humidifier",
  "fan",
  "filter",
  "brush",
  "comb",
  "attachment",
  "stand",
  "case",
  "storage case",
  "travel pouch",
  "charger",
  "battery",
  "vacuum",
  "straightener",
  "styler",
  "storage bag",
  "spare part",
  "cleaner",
];

const PLAYSTATION_HARD_REJECT_KEYWORDS = [
  "dualsense",
  "dualshock",
  "controller",
  "gamepad",
  "headset",
  "headphones",
  "pulse",
  "ps vr",
  "vr2",
  "camera",
  "charging station",
  "dock",
  "stand",
  "cover",
  "faceplate",
  "skin",
  "game",
  "disc",
  "gift card",
  "plus subscription",
  "ssd only",
  "remote",
  "portal",
  "cable",
  "hdmi",
  "adapter",
];

const DYSON_HAIR_DRYER_HINTS = [
  "hair dryer",
  "hair-dryer",
  "фен",
  "fohn",
  "supersonic",
  "dryer",
];

const PLAYSTATION_CONSOLE_HINTS = [
  "playstation",
  "ps4",
  "ps5",
  "console",
  "gaming console",
  "игровая приставка",
  "консоль",
];

const PLAYSTATION_GAME_PATTERNS = [
  /\bfifa\b/i,
  /\bnba\b/i,
  /\b2k\d+/i,
  /\bgrand theft auto\b/i,
  /\bgta\b/i,
  /\bmortal kombat\b/i,
  /\bbattlefield\b/i,
  /\bresident evil\b/i,
  /\bassassin/i,
  /\bvalhalla\b/i,
  /\bhogwarts\b/i,
  /\blegacy\b/i,
  /\bcall of duty\b/i,
  /\bcod\b/i,
  /\belden ring\b/i,
  /\bspider-?man\b/i,
  /\bhorizon\b/i,
  /\bghost of\b/i,
  /\buncharted\b/i,
  /\bgod of war\b/i,
  /\bthe last of us\b/i,
  /\bratchet\b/i,
  /\breturnal\b/i,
  /\bdemon'?s souls\b/i,
  /\bastro'?s\b/i,
  /\bgran turismo\b/i,
  /\bwwe\b/i,
  /\bmlb\b/i,
  /\bnhl\b/i,
  /\btekken\b/i,
  /\bstreet fighter\b/i,
  /\bdiablo\b/i,
  /\boverwatch\b/i,
  /\bfortnite\b/i,
  /\broblox\b/i,
  /\bminecraft\b/i,
];

const PLAYSTATION_ACCESSORY_PATTERNS = [
  /\bhori\b/i,
  /\bbackbone\b/i,
  /\bthrustmaster\b/i,
  /\bracing wheel\b/i,
  /\bsteering wheel\b/i,
  /\bwheel for playstation\b/i,
  /\bfor playstation 5\b.*\bfor playstation 4\b/i,
];

const PLAYSTATION_MIN_PRICE_AMD = {
  "Sony PlayStation 4": 70000,
  "Sony PlayStation 4 Slim": 70000,
  "Sony PlayStation 4 Pro": 90000,
  "Sony PlayStation 5": 180000,
  "Sony PlayStation 5 Digital Edition": 160000,
  "Sony PlayStation 5 Slim": 170000,
  "Sony PlayStation 5 Slim Digital Edition": 150000,
  "Sony PlayStation 5 Pro": 250000,
};

const DYSON_MIN_PRICE_AMD = 80000;

const MOBILECENTRE_CATEGORY_URLS = [
  "https://www.mobilecentre.am/category/beauty-and-health/",
  "https://www.mobilecentre.am/category/hair-care/",
  "https://www.mobilecentre.am/category/gaming/",
  "https://www.mobilecentre.am/category/consoles/",
  "https://www.mobilecentre.am/category/electronics/",
];

const MOBILECENTRE_KNOWN_PRODUCT_URLS = [
  "https://www.mobilecentre.am/product/dyson-hair-dryer-hd08-supersonic-sg_my_hk_lr_lr_fu/33338/",
  "https://www.mobilecentre.am/product/sony-playstation-5-slim-_white_/30224/",
];

const YEREVANMOBILE_KNOWN_PRODUCT_URLS = [
  "https://www.yerevanmobile.am/en/sony-ps5-digital-825gb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-1tb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-eu.html",
  "https://www.yerevanmobile.am/en/sony-ps5-pro.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-fifa-26.html",
  "https://www.yerevanmobile.am/en/dyson-hd18-supersonic-vinca-blue-topaz.html",
];

const YEREVANMOBILE_CATEGORY_URLS = [
  "https://www.yerevanmobile.am/en/beauty-and-health/dyson.html",
  "https://www.yerevanmobile.am/en/electronics/gaming/playstation.html",
  "https://www.yerevanmobile.am/en/electronics/gaming/consoles.html",
  "https://www.yerevanmobile.am/am/electronics/gaming/playstation.html",
  "https://www.yerevanmobile.am/ru/electronics/gaming/playstation.html",
];

function buildSearchQueries(target) {
  const model = target.model.trim();
  const queries = [model];
  const extras = {
    "Dyson Supersonic": ["Dyson Supersonic hair dryer", "Dyson фен Supersonic", "Dyson Supersonic HD"],
    "Dyson Supersonic Nural": ["Dyson Supersonic Nural HD16", "Dyson Nural hair dryer"],
    "Dyson Supersonic r": ["Dyson Supersonic r hair dryer", "Dyson Supersonic r HD"],
    "Dyson Supersonic Travel": ["Dyson Supersonic Travel dryer", "Dyson Travel hair dryer"],
    "Sony PlayStation 5": ["PS5 console", "PlayStation 5 console", "Sony PS5"],
    "Sony PlayStation 5 Digital Edition": ["PS5 Digital Edition", "PlayStation 5 Digital"],
    "Sony PlayStation 5 Slim": ["PS5 Slim console", "PlayStation 5 Slim", "Sony PlayStation 5 Slim White"],
    "Sony PlayStation 5 Slim Digital Edition": ["PS5 Slim Digital", "PlayStation 5 Slim Digital Edition"],
    "Sony PlayStation 5 Pro": ["PS5 Pro console", "PlayStation 5 Pro 2TB"],
    "Sony PlayStation 4": ["PS4 console", "PlayStation 4"],
    "Sony PlayStation 4 Slim": ["PS4 Slim console", "PlayStation 4 Slim"],
    "Sony PlayStation 4 Pro": ["PS4 Pro console", "PlayStation 4 Pro"],
  };
  if (extras[model]) queries.push(...extras[model]);
  return [...new Set(queries.filter(Boolean))];
}

function writeTargetsTsv(filePath, fs) {
  const lines = DEVICE_TARGETS.map((t) =>
    [t.type, t.category, t.model, "", "", "", "", "", "", "", "", "", ""].join("\t"),
  );
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

module.exports = {
  DYSON_HAIR_DRYER_PARENT_MODELS,
  PLAYSTATION_CONSOLE_PARENT_MODELS,
  DEVICE_TARGETS,
  DYSON_HARD_REJECT_KEYWORDS,
  PLAYSTATION_HARD_REJECT_KEYWORDS,
  DYSON_HAIR_DRYER_HINTS,
  PLAYSTATION_CONSOLE_HINTS,
  PLAYSTATION_GAME_PATTERNS,
  PLAYSTATION_ACCESSORY_PATTERNS,
  PLAYSTATION_MIN_PRICE_AMD,
  DYSON_MIN_PRICE_AMD,
  MOBILECENTRE_KNOWN_PRODUCT_URLS,
  YEREVANMOBILE_KNOWN_PRODUCT_URLS,
  MOBILECENTRE_CATEGORY_URLS,
  YEREVANMOBILE_CATEGORY_URLS,
  buildSearchQueries,
  writeTargetsTsv,
};
