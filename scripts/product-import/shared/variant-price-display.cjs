"use strict";

function hasDisplayPrice(variant) {
  if (!variant || variant.priceOnRequest === true) return false;
  const p = variant.price;
  return typeof p === "number" && Number.isFinite(p) && p > 0;
}

function hasPurchasablePrice(variant) {
  return hasDisplayPrice(variant);
}

function pickListingPriceVariant(variants, preferred) {
  if (preferred && hasDisplayPrice(preferred)) return preferred;
  const priced = variants.filter(hasDisplayPrice);
  if (!priced.length) return null;
  return [...priced].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
}

function assertVariantPurchasable(variant) {
  if (!hasPurchasablePrice(variant)) {
    const err = {
      status: 422,
      type: "https://api.shop.am/problems/validation-error",
      title: "Price unavailable",
      detail: "This product is not available for purchase online. Please contact us for pricing.",
    };
    throw err;
  }
}

function assertCartLinePurchasable(item) {
  if (item.variant) {
    assertVariantPurchasable(item.variant);
  }
  const snap = item.priceSnapshot;
  if (typeof snap !== "number" || !Number.isFinite(snap) || snap <= 0) {
    const err = {
      status: 422,
      type: "https://api.shop.am/problems/validation-error",
      title: "Price unavailable",
      detail: "This product is not available for purchase online. Please contact us for pricing.",
    };
    throw err;
  }
}

module.exports = {
  hasDisplayPrice,
  hasPurchasablePrice,
  pickListingPriceVariant,
  assertVariantPurchasable,
  assertCartLinePurchasable,
};
