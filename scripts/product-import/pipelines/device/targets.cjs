"use strict";

const DYSON_HAIR_DRYER_PARENT_MODELS = [
  "Dyson Supersonic",
  "Dyson Supersonic Nural",
  "Dyson Supersonic r",
  "Dyson Supersonic Travel",
];

const DYSON_HAIR_STYLER_PARENT_MODELS = [
  "Dyson Airwrap HS05",
  "Dyson Airwrap i.d. HS08",
  "Dyson Airwrap Co-anda2x HS09",
];

const DYSON_HAIR_STRAIGHTENER_PARENT_MODELS = [
  "Dyson Airstrait",
  "Dyson Corrale",
];

const DYSON_HAIR_PARENT_MODELS = [
  ...DYSON_HAIR_DRYER_PARENT_MODELS,
  ...DYSON_HAIR_STYLER_PARENT_MODELS,
  ...DYSON_HAIR_STRAIGHTENER_PARENT_MODELS,
];

const DYSON_CATEGORY_BY_PARENT = {
  "Dyson Supersonic": "Hair Dryers",
  "Dyson Supersonic Nural": "Hair Dryers",
  "Dyson Supersonic r": "Hair Dryers",
  "Dyson Supersonic Travel": "Hair Dryers",
  "Dyson Airwrap HS05": "Hair Stylers",
  "Dyson Airwrap i.d. HS08": "Hair Stylers",
  "Dyson Airwrap Co-anda2x HS09": "Hair Stylers",
  "Dyson Airstrait": "Hair Straighteners",
  "Dyson Corrale": "Hair Straighteners",
};

const DYSON_CATEGORY_SLUG_BY_PARENT = {
  "Dyson Supersonic": "hair-dryers",
  "Dyson Supersonic Nural": "hair-dryers",
  "Dyson Supersonic r": "hair-dryers",
  "Dyson Supersonic Travel": "hair-dryers",
  "Dyson Airwrap HS05": "hair-stylers",
  "Dyson Airwrap i.d. HS08": "hair-stylers",
  "Dyson Airwrap Co-anda2x HS09": "hair-stylers",
  "Dyson Airstrait": "hair-straighteners",
  "Dyson Corrale": "hair-straighteners",
};

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
  ...DYSON_HAIR_PARENT_MODELS.map((model) => ({
    type: "dyson",
    model,
    category: DYSON_CATEGORY_BY_PARENT[model],
  })),
  ...PLAYSTATION_CONSOLE_PARENT_MODELS.map((model) => ({
    type: "playstation",
    model,
    category: "Game Consoles",
  })),
];

/** Non-hair appliances / parts — always reject (contextual exceptions applied in normalize). */
const DYSON_NON_HAIR_REJECT_KEYWORDS = [
  "v15",
  "v12",
  "v11",
  "v10",
  "v8",
  "v7",
  "gen5",
  "big ball",
  "big+quiet",
  "big quiet",
  "purifier",
  "humidify",
  "humidifier",
  "hot+cool",
  "hot cool",
  "cool",
  "heater",
  "fan",
  "vacuum",
  "cleaner",
  "washg1",
  "wash",
  "zone",
  "solarcycle",
  "headphone",
  "headphones",
  "lamp",
  "lighting",
];

const DYSON_ACCESSORY_REJECT_KEYWORDS = [
  "filter",
  "brush",
  "comb",
  "attachment",
  "barrel",
  "diffuser",
  "concentrator",
  "stand",
  "wall mount",
  "case",
  "storage case",
  "presentation case",
  "travel pouch",
  "storage bag",
  "charger",
  "dock",
  "battery",
  "spare part",
  "replacement",
  "cable",
];

/** @deprecated use DYSON_NON_HAIR_REJECT_KEYWORDS + accessory logic */
const DYSON_HARD_REJECT_KEYWORDS = [
  ...DYSON_NON_HAIR_REJECT_KEYWORDS,
  ...DYSON_ACCESSORY_REJECT_KEYWORDS,
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

const DYSON_HAIR_DEVICE_HINTS = [
  ...DYSON_HAIR_DRYER_HINTS,
  "airwrap",
  "airstrait",
  "corrale",
  "hair styler",
  "multi-styler",
  "multistyler",
  "straightener",
  "co-anda",
  "coanda",
  "hs05",
  "hs08",
  "hs09",
  "hs03",
  "ht01",
  "hd08",
  "hd16",
  "hd17",
  "hd18",
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
  "https://www.mobilecentre.am/product/dyson-hs05-airwrap-multistyler-complete-hair-styler-_nickel-copper_/33786/",
  "https://www.mobilecentre.am/product/dyson-hs08-hair-styler-prussian-blue/33789/",
  "https://www.mobilecentre.am/product/dyson-hs08-hair-styler-amber-silk/33787/",
  "https://www.mobilecentre.am/product/dyson-hs08-hair-styler-vinca-blue-topaz/33790/",
  "https://www.mobilecentre.am/product/dyson-hs08-hair-styler-ceramic-pink/33788/",
  "https://www.mobilecentre.am/product/dyson-hs09-hair-styler-_jasper-plum_/33793/",
  "https://www.mobilecentre.am/product/dyson-hs09-hair-styler-_amber-silk_/33791/",
  "https://www.mobilecentre.am/product/sony-playstation-5-slim-_white_/30224/",
];

const YEREVANMOBILE_KNOWN_PRODUCT_URLS = [
  "https://www.yerevanmobile.am/en/sony-ps5-digital-825gb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-1tb.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-eu.html",
  "https://www.yerevanmobile.am/en/sony-ps5-pro.html",
  "https://www.yerevanmobile.am/en/sony-ps5-slim-digital-edition-fifa-26.html",
  "https://www.yerevanmobile.am/en/dyson-hd18-supersonic-vinca-blue-topaz.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-hs08-jasper-plum.html",
  "https://www.yerevanmobile.am/en/dyson-hs08-airwrap-id-multi-styler-red-velvet-gold.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-hs08-patina-topaz.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-id-hs08-ceramic-apricot.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-id-hs08-ceramic-amber-silk.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-id-hs08-ceramic-prussian-blue.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-id-hs08-ceramic-vinca-blue.html",
  "https://www.yerevanmobile.am/en/dyson-airwrap-i-d-hs08-straight-wavy-kanzan-pink.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-ceramic-pink.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-jasper-plum.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-amber-silk.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-co-anda2x-straight-wavy-red-velvet.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-co-anda2x-straight-wavy-apricot-topaz.html",
  "https://www.yerevanmobile.am/en/dyson-hs09-airwrap-co-anda2x-curly-coily-amber-silk.html",
];

const YEREVANMOBILE_CATEGORY_URLS = [
  "https://www.yerevanmobile.am/en/electronics/gaming/playstation.html",
  "https://www.yerevanmobile.am/en/electronics/gaming/consoles.html",
];

const DYSON_EXTRA_SEARCH_QUERIES = [
  "Dyson Supersonic",
  "Dyson Supersonic Nural",
  "Dyson Supersonic r",
  "Dyson Supersonic Travel",
  "Dyson Airwrap",
  "Dyson Airwrap Complete",
  "Dyson Airwrap Multi-Styler",
  "Dyson Airwrap i.d.",
  "Dyson Airwrap ID",
  "Dyson HS05",
  "Dyson HS08",
  "Dyson HS09",
  "Dyson Co-anda2x",
  "Dyson Coanda 2x",
  "Dyson Hair Styler",
  "Dyson Airstrait",
  "Dyson Corrale",
  "Dyson Hair Straightener",
  "Dyson HT01",
];

function buildSearchQueries(target) {
  const model = target.model.trim();
  const queries = [model];
  const extras = {
    "Dyson Supersonic": ["Dyson Supersonic hair dryer", "Dyson фен Supersonic", "Dyson Supersonic HD"],
    "Dyson Supersonic Nural": ["Dyson Supersonic Nural HD16", "Dyson Nural hair dryer"],
    "Dyson Supersonic r": ["Dyson Supersonic r hair dryer", "Dyson Supersonic r HD"],
    "Dyson Supersonic Travel": ["Dyson Supersonic Travel dryer", "Dyson Travel hair dryer"],
    "Dyson Airwrap HS05": ["Dyson HS05", "Dyson Airwrap Complete", "Dyson Airwrap Multistyler", "Dyson Airwrap HS05"],
    "Dyson Airwrap i.d. HS08": [
      "Dyson HS08",
      "Dyson Airwrap i.d.",
      "Dyson Airwrap ID",
      "Dyson Airwrap HS08",
      "Dyson Hair Styler HS08",
    ],
    "Dyson Airwrap Co-anda2x HS09": [
      "Dyson HS09",
      "Dyson Co-anda2x",
      "Dyson Coanda 2x",
      "Dyson Airwrap HS09",
      "Dyson Hair Styler HS09",
    ],
    "Dyson Airstrait": ["Dyson Airstrait", "Dyson HT01", "Dyson Hair Straightener"],
    "Dyson Corrale": ["Dyson Corrale", "Dyson HS03", "Dyson straightener Corrale"],
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
  DYSON_HAIR_STYLER_PARENT_MODELS,
  DYSON_HAIR_STRAIGHTENER_PARENT_MODELS,
  DYSON_HAIR_PARENT_MODELS,
  DYSON_CATEGORY_BY_PARENT,
  DYSON_CATEGORY_SLUG_BY_PARENT,
  PLAYSTATION_CONSOLE_PARENT_MODELS,
  DEVICE_TARGETS,
  DYSON_HARD_REJECT_KEYWORDS,
  DYSON_NON_HAIR_REJECT_KEYWORDS,
  DYSON_ACCESSORY_REJECT_KEYWORDS,
  PLAYSTATION_HARD_REJECT_KEYWORDS,
  DYSON_HAIR_DRYER_HINTS,
  DYSON_HAIR_DEVICE_HINTS,
  PLAYSTATION_CONSOLE_HINTS,
  PLAYSTATION_GAME_PATTERNS,
  PLAYSTATION_ACCESSORY_PATTERNS,
  PLAYSTATION_MIN_PRICE_AMD,
  DYSON_MIN_PRICE_AMD,
  MOBILECENTRE_KNOWN_PRODUCT_URLS,
  YEREVANMOBILE_KNOWN_PRODUCT_URLS,
  MOBILECENTRE_CATEGORY_URLS,
  YEREVANMOBILE_CATEGORY_URLS,
  DYSON_EXTRA_SEARCH_QUERIES,
  buildSearchQueries,
  writeTargetsTsv,
};
