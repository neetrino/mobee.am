"use strict";

/**
 * Image format / dimension helpers for official image pipeline.
 */

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MIN_PRIMARY_SIDE = 600;
const MIN_FALLBACK_SIDE = 450;
/** Manual QR / last-resort floor when allowLowResolution=true. */
const MIN_LAST_RESORT_SIDE = 300;

/**
 * @returns {{ mime: string, ext: string }|null}
 */
function sniffImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return { mime: "image/gif", ext: "gif" };
  }
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  // AVIF / HEIF brand
  if (
    buffer.toString("ascii", 4, 8) === "ftyp" &&
    /avif|avis|mif1|msf1/i.test(buffer.toString("ascii", 8, 16))
  ) {
    return { mime: "image/avif", ext: "avif" };
  }
  return null;
}

function readAvifDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 32) return null;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return null;

  function walk(start, end) {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) break;
        size = Number(buffer.readBigUInt64BE(offset + 8));
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (!Number.isFinite(size) || size < header) break;
      const boxEnd = Math.min(offset + size, end);
      if (type === "ispe" && offset + header + 12 <= boxEnd) {
        // FullBox: version(1)+flags(3) then width/height
        const width = buffer.readUInt32BE(offset + header + 4);
        const height = buffer.readUInt32BE(offset + header + 8);
        if (width > 0 && height > 0) return { width, height };
      }
      if (
        ["meta", "iprp", "ipco", "moov", "trak", "mdia", "minf", "stbl"].includes(
          type
        )
      ) {
        const nestedStart =
          type === "meta" ? offset + header + 4 : offset + header;
        const found = walk(nestedStart, boxEnd);
        if (found) return found;
      }
      offset = boxEnd;
    }
    return null;
  }

  return walk(0, buffer.length);
}

/**
 * Minimal image dimension probe (JPEG / PNG / GIF / WebP / AVIF).
 * @returns {{ width: number, height: number }|null}
 */
function readImageDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
  try {
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      const chunk = buffer.toString("ascii", 12, 16);
      if (chunk === "VP8X" && buffer.length >= 30) {
        return {
          width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
          height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16),
        };
      }
      if (chunk === "VP8 " && buffer.length >= 30) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === "VP8L" && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const size = buffer.readUInt16BE(offset + 2);
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + size;
      }
    }
    const avif = readAvifDimensions(buffer);
    if (avif) return avif;
  } catch {
    return null;
  }
  return null;
}

function resolveMime(contentType, buffer) {
  const header = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  const sniffed = sniffImageFormat(buffer);
  if (ALLOWED_IMAGE_MIME.has(header) || header === "image/jpg") {
    return {
      mime: header === "image/jpg" ? "image/jpeg" : header,
      ext: sniffed?.ext || null,
      sniffed: false,
      warning: null,
    };
  }
  if (
    (header === "application/octet-stream" ||
      header === "binary/octet-stream" ||
      !header) &&
    sniffed
  ) {
    return {
      mime: sniffed.mime,
      ext: sniffed.ext,
      sniffed: true,
      warning: "MIME_SNIFFED_FROM_BINARY",
    };
  }
  if (sniffed && header.startsWith("image/")) {
    return {
      mime: sniffed.mime,
      ext: sniffed.ext,
      sniffed: true,
      warning: "MIME_SNIFFED_FROM_BINARY",
    };
  }
  return { mime: null, ext: null, sniffed: false, warning: null };
}

/**
 * @param {{ width: number, height: number }|null} dims
 * @param {{ allowLowResolution?: boolean }} [options]
 */
function classifyResolution(dims, options = {}) {
  const allowLowResolution = Boolean(options.allowLowResolution);
  const minSide = allowLowResolution ? MIN_LAST_RESORT_SIDE : MIN_FALLBACK_SIDE;
  if (!dims || dims.width < minSide || dims.height < minSide) {
    return { ok: false, status: "TOO_SMALL_DIMENSIONS" };
  }
  if (dims.width >= MIN_PRIMARY_SIDE && dims.height >= MIN_PRIMARY_SIDE) {
    return { ok: true, status: "PRIMARY_RES" };
  }
  if (
    dims.width >= MIN_FALLBACK_SIDE &&
    dims.height >= MIN_FALLBACK_SIDE
  ) {
    return { ok: true, status: "LOW_RES_OFFICIAL_FALLBACK" };
  }
  if (allowLowResolution) {
    return { ok: true, status: "LOW_RES_OFFICIAL_LAST_RESORT" };
  }
  return { ok: false, status: "TOO_SMALL_DIMENSIONS" };
}

function isGifMime(mime) {
  return String(mime || "").toLowerCase() === "image/gif";
}

function isStaticPhotoMime(mime) {
  const m = String(mime || "").toLowerCase();
  return (
    m === "image/jpeg" ||
    m === "image/png" ||
    m === "image/webp" ||
    m === "image/avif"
  );
}

/**
 * Prefer static product photos over GIF for primary slot ordering.
 */
function sortValidatedForPrimary(images) {
  return [...images].sort((a, b) => {
    const aGif = isGifMime(a.contentType) ? 1 : 0;
    const bGif = isGifMime(b.contentType) ? 1 : 0;
    if (aGif !== bGif) return aGif - bGif;
    const aArea = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
    const bArea = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);
    if (bArea !== aArea) return bArea - aArea;
    return (b.score || 0) - (a.score || 0);
  });
}

module.exports = {
  ALLOWED_IMAGE_MIME,
  MIN_PRIMARY_SIDE,
  MIN_FALLBACK_SIDE,
  MIN_LAST_RESORT_SIDE,
  sniffImageFormat,
  readImageDimensions,
  resolveMime,
  classifyResolution,
  isGifMime,
  isStaticPhotoMime,
  sortValidatedForPrimary,
};
