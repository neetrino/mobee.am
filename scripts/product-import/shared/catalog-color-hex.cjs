/**
 * Compact HEX lookup for catalog color AttributeValue.colors.
 * Unknown names stay empty — never persist the UI fallback gray.
 */

"use strict";

function compactColorKey(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");
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
};

/**
 * @param {string} colorName
 * @returns {string[]}
 */
function hexesForColorName(colorName) {
  const hex = HEX_BY_COMPACT[compactColorKey(colorName)];
  return hex ? [hex] : [];
}

module.exports = {
  compactColorKey,
  hexesForColorName,
};
