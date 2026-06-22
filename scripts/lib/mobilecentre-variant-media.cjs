"use strict";

const path = require("path");
const https = require("https");
const http = require("http");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const R2_MC_PREFIX = "products/mobilecentre";
const MOBILECENTRE_HOST_PATTERN = /mobilecentre\.am/i;

function extFromUrl(url) {
  try {
    const raw = path.extname(new URL(url).pathname).toLowerCase().replace(/[^a-z]/g, "");
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(raw)
      ? (raw === "jpeg" ? "jpg" : raw)
      : "jpg";
  } catch {
    return "jpg";
  }
}

function mimeFromExt(ext) {
  const map = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[ext] || "image/jpeg";
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function uploadToR2(r2, bucket, publicUrlBase, key, url, imageCache) {
  const cacheKey = `${key}::${url}`;
  if (imageCache[cacheKey]) return imageCache[cacheKey];
  const buf = await fetchBuffer(url);
  const ext = extFromUrl(url);
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: mimeFromExt(ext),
    })
  );
  const r2Url = `${publicUrlBase.replace(/\/$/, "")}/${key}`;
  imageCache[cacheKey] = r2Url;
  return r2Url;
}

function isMobileCentreUrl(url) {
  return typeof url === "string" && MOBILECENTRE_HOST_PATTERN.test(url);
}

function collectSourceGalleryUrls(variant) {
  const seen = new Set();
  const urls = [];
  const add = (u) => {
    if (!u || typeof u !== "string" || seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  if (Array.isArray(variant.gallery)) {
    for (const u of variant.gallery) add(u);
  }
  if (variant.image_url) add(variant.image_url);

  return urls;
}

function extractMediaUrl(item) {
  if (!item) return null;
  if (typeof item === "string") return item || null;
  if (typeof item === "object" && item.url) return item.url;
  return null;
}

function mediaHasMobileCentreUrl(media) {
  if (!Array.isArray(media)) return false;
  return media.some((item) => isMobileCentreUrl(extractMediaUrl(item)));
}

/**
 * Upload variant gallery to R2 and return { imageUrl, media }.
 * Keys: products/mobilecentre/{sourcePid}/main.{ext}, gallery-{index}.{ext}
 */
async function buildVariantMediaFromSource({
  r2,
  bucket,
  publicUrlBase,
  sourcePid,
  variant,
  imageCache,
  skipR2 = false,
  alt = "",
}) {
  const sourceUrls = collectSourceGalleryUrls(variant);
  if (!sourceUrls.length) {
    return { imageUrl: null, media: [] };
  }

  if (skipR2) {
    return {
      imageUrl: variant.image_url || sourceUrls[0] || null,
      media: sourceUrls.map((url) => ({ url, alt })),
    };
  }

  const media = [];
  let imageUrl = null;

  for (let index = 0; index < sourceUrls.length; index++) {
    const origUrl = sourceUrls[index];
    const ext = extFromUrl(origUrl);
    const key =
      index === 0
        ? `${R2_MC_PREFIX}/${sourcePid}/main.${ext}`
        : `${R2_MC_PREFIX}/${sourcePid}/gallery-${index}.${ext}`;

    try {
      const r2Url = await uploadToR2(r2, bucket, publicUrlBase, key, origUrl, imageCache);
      media.push({ url: r2Url, alt });
      if (index === 0) imageUrl = r2Url;
    } catch (err) {
      console.warn(`  ⚠  Gallery upload failed (${sourcePid}, idx ${index}): ${err.message}`);
    }
  }

  if (!imageUrl && media.length > 0) {
    imageUrl = extractMediaUrl(media[0]);
  }

  if (variant.image_url && media.length > 0) {
    const mainIndex = sourceUrls.indexOf(variant.image_url);
    if (mainIndex >= 0 && media[mainIndex]) {
      imageUrl = extractMediaUrl(media[mainIndex]);
      if (mainIndex > 0) {
        const mainItem = media[mainIndex];
        const rest = media.filter((_, i) => i !== mainIndex);
        return { imageUrl, media: [mainItem, ...rest] };
      }
    }
  }

  return { imageUrl, media };
}

function loadImageCache(cacheFile) {
  const fs = require("fs");
  if (!fs.existsSync(cacheFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch {
    return {};
  }
}

function saveImageCache(cacheFile, imageCache) {
  const fs = require("fs");
  fs.writeFileSync(cacheFile, JSON.stringify(imageCache, null, 2));
}

function flattenVariableProducts(groups) {
  if (!Array.isArray(groups)) return [];
  const flat = [];
  for (const group of groups) {
    if (!Array.isArray(group.variants)) continue;
    for (const variant of group.variants) {
      flat.push({
        ...variant,
        parentName: group.name,
        parentDescription: group.description,
        groupKey: group.group_key,
      });
    }
  }
  return flat;
}

function groupVariableProducts(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.filter((g) => Array.isArray(g.variants) && g.variants.length > 0);
}

module.exports = {
  R2_MC_PREFIX,
  MOBILECENTRE_HOST_PATTERN,
  extFromUrl,
  mimeFromExt,
  fetchBuffer,
  uploadToR2,
  isMobileCentreUrl,
  collectSourceGalleryUrls,
  extractMediaUrl,
  mediaHasMobileCentreUrl,
  buildVariantMediaFromSource,
  loadImageCache,
  saveImageCache,
  flattenVariableProducts,
  groupVariableProducts,
};
