"use strict";

const path = require("path");

const ROOT = path.join(__dirname, "../..");

const cache = {
  mobilecentreImageCache: path.join(
    ROOT,
    "data/product-import/cache/.mobilecentre-image-cache.json",
  ),
  appleSourceImportImageCache: path.join(
    ROOT,
    "data/product-import/cache/.apple-source-import-image-cache.json",
  ),
  samsungSourceImportImageCache: path.join(
    ROOT,
    "data/product-import/cache/.samsung-source-import-image-cache.json",
  ),
  samsungYerevanmobileImportImageCache: path.join(
    ROOT,
    "data/product-import/cache/.samsung-yerevanmobile-import-image-cache.json",
  ),
  deviceSourceImportImageCache: path.join(
    ROOT,
    "data/product-import/cache/.device-source-import-image-cache.json",
  ),
};

module.exports = { ROOT, cache };
