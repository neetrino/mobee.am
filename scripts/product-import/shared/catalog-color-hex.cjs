/**
 * Compact HEX lookup for catalog color AttributeValue.colors.
 * Unknown names stay empty — never persist the UI fallback gray.
 * Marketing names like "Titanium Black" resolve to the hue, not gray.
 * Dyson CMF aliases resolve via dyson-color-registry before generic hue tokens.
 */

"use strict";

const { resolveDysonColor } = require("./dyson-color-registry.cjs");

const GENERIC_MATERIALS = new Set([
  "titanium",
  "phantom",
  "awesome",
  "metallic",
  "matte",
  "gloss",
  "glossy",
  "ceramic",
  "frost",
  "satin",
  "pearl",
  "silk",
  "velvet",
]);

const MIN_COMPOUND_PART_LENGTH = 3;

function compactColorKey(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_/-]+/g, "");
}

function tokenizeColorName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .split(/[\s_/-]+/)
    .filter(Boolean);
}

const HEX_BY_COMPACT = {
  beige: "#F5F5DC",
  black: "#1D1D1F",
  jetblack: "#0A0A0A",
  blue: "#276787",
  blueshadow: "#5C6E7A",
  silvershadow: "#C8C9CE",
  brown: "#A52A2A",
  gray: "#808080",
  grey: "#808080",
  green: "#394C38",
  red: "#BF0013",
  white: "#FFFFFF",
  yellow: "#F9E479",
  orange: "#FF8A4C",
  pink: "#FADDD7",
  purple: "#594F63",
  navy: "#000080",
  maroon: "#800000",
  olive: "#808000",
  teal: "#4A9B8E",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  lime: "#00FF00",
  silver: "#E2E3E4",
  gold: "#F4E8CE",
  tan: "#D2B48C",
  khaki: "#F0E68C",
  coral: "#FF7F50",
  salmon: "#FA8072",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  indigo: "#3D3F84",
  crimson: "#DC143C",
  lavender: "#E6E6FA",
  peach: "#FFE5B4",
  mint: "#98FB98",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  spaceblack: "#1D1D1F",
  spacegray: "#535150",
  spacegrey: "#535150",
  starlight: "#F6F2EF",
  midnight: "#232A35",
  deeppurple: "#59456B",
  ultramarine: "#2E4A8A",
  deepblue: "#1E2D49",
  lightblue: "#A8C8E8",
  mistblue: "#A8B8C8",
  lightgreen: "#BDD5B0",
  lightyellow: "#F5F0A8",
  lightgold: "#F5E6C8",
  softpink: "#F5D0C8",
  blush: "#E8C4C4",
  sage: "#AFBFA5",
  citrus: "#E8EEA9",
  cloudwhite: "#F5F5F7",
  cosmicorange: "#FF8932",
  darkcherry: "#5A1F23",
  darkgray: "#545454",
  darkgrey: "#545454",
  desertblack: "#2B2B2B",
  deserttitanium: "#C9B896",
  naturaltitanium: "#837F7D",
  skyblue: "#A7C7E7",
  bluetitanium: "#394E63",
  blacktitanium: "#2B2B2C",
  whitetitanium: "#F2F1ED",
  silvertitanium: "#C2C2C2",
  goldtitanium: "#C9A227",
  orangetitanium: "#C65A30",
  midnighttitanium: "#3C3C3D",
  graytitanium: "#8B8D91",
  greytitanium: "#8B8D91",
  twillblack: "#1A1A1A",
  graygreen: "#78866B",
  clear: "#F0F0F0",
  transparent: "#FFFFFF",
  sky: "#A7C7E7",
  titanium: "#837F7D",
  graphite: "#53565A",
  bronze: "#B08D57",
  burgundy: "#6D2E4B",
  jade: "#5B7F6E",
  jadegreen: "#5B7F6E",
  silverblue: "#8FA4B8",
  whitesilver: "#F2F1ED",
  pinkgold: "#E6C2B0",
  rosegold: "#E6C2B0",
  patina: "#6A8F7A",
  nickel: "#C0C5C7",
  copper: "#B87333",
  sakura: "#F3C6C6",
  cherry: "#C44B6A",
  amber: "#D4A017",
  apricot: "#FBCEB1",
  topaz: "#E6C35C",
  plum: "#6B3A6B",
  rose: "#E8B4B8",
  strawberry: "#E25C5C",
  lightviolet: "#C5A8D4",
};

function hexFromGenericMaterial(compact) {
  for (const material of GENERIC_MATERIALS) {
    if (compact.startsWith(material) && compact.length > material.length) {
      const rest = compact.slice(material.length);
      if (HEX_BY_COMPACT[rest]) return HEX_BY_COMPACT[rest];
    }
    if (compact.endsWith(material) && compact.length > material.length) {
      const rest = compact.slice(0, compact.length - material.length);
      if (HEX_BY_COMPACT[rest]) return HEX_BY_COMPACT[rest];
    }
  }
  return null;
}

function hexFromHueTokens(colorName) {
  const words = tokenizeColorName(colorName);
  if (words.length === 0) return null;

  const matches = [];
  for (let index = 0; index < words.length; index += 1) {
    for (let size = words.length - index; size >= 1; size -= 1) {
      const compact = words.slice(index, index + size).join("");
      const hex = HEX_BY_COMPACT[compact];
      if (!hex) continue;
      matches.push({ compact, hex, generic: GENERIC_MATERIALS.has(compact) });
    }
  }
  if (matches.length === 0) return null;
  const hueMatch = matches.find((item) => !item.generic);
  return (hueMatch || matches[0]).hex;
}

function hexFromCompoundCompact(compact) {
  const parts = Object.keys(HEX_BY_COMPACT)
    .filter((item) => item.length >= MIN_COMPOUND_PART_LENGTH)
    .sort((a, b) => b.length - a.length);

  for (const left of parts) {
    if (!compact.startsWith(left) || compact === left) continue;
    const rest = compact.slice(left.length);
    const rightHex = HEX_BY_COMPACT[rest];
    if (!rightHex) continue;
    const leftGeneric = GENERIC_MATERIALS.has(left);
    const rightGeneric = GENERIC_MATERIALS.has(rest);
    if (leftGeneric && !rightGeneric) return rightHex;
    if (rightGeneric && !leftGeneric) return HEX_BY_COMPACT[left];
    return rightHex;
  }
  return null;
}

/**
 * @param {string} colorName
 * @returns {string[]}
 */
function hexesForSingleName(colorName) {
  const compact = compactColorKey(colorName);
  if (!compact) return [];
  if (HEX_BY_COMPACT[compact]) return [HEX_BY_COMPACT[compact]];

  const sortedCompact = tokenizeColorName(colorName).sort().join("");
  if (HEX_BY_COMPACT[sortedCompact]) return [HEX_BY_COMPACT[sortedCompact]];

  const resolved =
    hexFromGenericMaterial(compact) ||
    hexFromHueTokens(colorName) ||
    hexFromCompoundCompact(compact);

  return resolved ? [resolved] : [];
}

function hexesForColorName(colorName) {
  const dyson = resolveDysonColor(colorName);
  if (dyson.status === "resolved") return [...dyson.entry.colors];

  const parts = String(colorName || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const hexes = parts.flatMap((part) => hexesForSingleName(part)).slice(0, 2);
    if (hexes.length > 0) return hexes;
  }

  return hexesForSingleName(colorName);
}

module.exports = {
  compactColorKey,
  hexesForColorName,
};
