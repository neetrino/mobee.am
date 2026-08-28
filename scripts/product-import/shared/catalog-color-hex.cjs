/**
 * Compact HEX lookup for catalog color AttributeValue.colors.
 * Unknown names stay empty — never persist the UI fallback gray.
 * Marketing names like "Titanium Black" resolve to the hue, not gray.
 */

"use strict";

const GENERIC_MATERIALS = [
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
];

function compactColorKey(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_/-]+/g, "");
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
  silver: "#E2E3E4",
  gold: "#F4E8CE",
  midnight: "#232A35",
  starlight: "#F6F2EF",
  spaceblack: "#1D1D1F",
  spacegray: "#535150",
  spacegrey: "#535150",
  blacktitanium: "#2B2B2C",
  bluetitanium: "#394E63",
  whitetitanium: "#F2F1ED",
  silvertitanium: "#C2C2C2",
  goldtitanium: "#C9A227",
  orangetitanium: "#C65A30",
  midnighttitanium: "#3C3C3D",
  graytitanium: "#8B8D91",
  greytitanium: "#8B8D91",
  deserttitanium: "#C9B896",
  naturaltitanium: "#837F7D",
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
  violet: "#EE82EE",
  lime: "#00FF00",
  teal: "#4A9B8E",
  cream: "#FFFDD0",
  lavender: "#E6E6FA",
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

/**
 * @param {string} colorName
 * @returns {string[]}
 */
function hexesForColorName(colorName) {
  const compact = compactColorKey(colorName);
  if (!compact) return [];
  if (HEX_BY_COMPACT[compact]) return [HEX_BY_COMPACT[compact]];

  const words = String(colorName || "")
    .toLowerCase()
    .trim()
    .split(/[\s_/-]+/)
    .filter(Boolean);
  const sortedCompact = [...words].sort().join("");
  if (HEX_BY_COMPACT[sortedCompact]) return [HEX_BY_COMPACT[sortedCompact]];

  const fromMaterial = hexFromGenericMaterial(compact);
  return fromMaterial ? [fromMaterial] : [];
}

module.exports = {
  compactColorKey,
  hexesForColorName,
};
