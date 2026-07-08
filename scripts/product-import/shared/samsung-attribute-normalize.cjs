"use strict";

function normalizeStorage(value) {
  if (!value) return null;
  const text = String(value).trim();
  const tb = text.match(/^(\d+)\s*TB$/i);
  if (tb) return `${tb[1]} TB`;
  const gb = text.match(/^(\d+)\s*GB$/i);
  if (gb) return `${gb[1]} GB`;
  return text.replace(/(\d+)\s*(GB|TB)/gi, (_, amount, unit) => `${amount} ${unit.toUpperCase()}`);
}

function normalizeRam(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/RAM$/i.test(text)) {
    return text.replace(/(\d+)\s*GB\s*RAM/i, (_, amount) => `${amount} GB RAM`);
  }
  const gb = text.match(/^(\d+)\s*GB$/i);
  if (gb) return `${gb[1]} GB RAM`;
  return text;
}

function normalizeColor(value) {
  if (!value) return null;
  return String(value).trim();
}

function normalizeConnectivity(value) {
  if (!value) return null;
  const text = String(value).trim().toUpperCase();
  if (text.includes("5G")) return "5G";
  if (text.includes("4G") || text.includes("LTE")) return "4G";
  return String(value).trim();
}

function normalizeVariantOptions(options) {
  const normalized = {};
  if (!options || typeof options !== "object") return normalized;

  if (options.color) normalized.color = normalizeColor(options.color);
  if (options.storage || options.memory) {
    normalized.storage = normalizeStorage(options.storage || options.memory);
  }
  if (options.ram || options.gb_ram) {
    normalized.ram = normalizeRam(options.ram || options.gb_ram);
  }
  if (options.connectivity) normalized.connectivity = normalizeConnectivity(options.connectivity);
  if (options.sim) normalized.sim = String(options.sim).trim();
  if (options.size) normalized.size = String(options.size).trim();

  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v));
}

module.exports = {
  normalizeStorage,
  normalizeRam,
  normalizeColor,
  normalizeConnectivity,
  normalizeVariantOptions,
};
