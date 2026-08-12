"use strict";

const https = require("https");
const http = require("http");

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_HTML_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
};

function fetchResponse(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = MAX_HTML_BYTES,
    redirect = "follow",
    maxRedirects = 5,
  } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(value);
    };

    const lib = String(url).startsWith("https") ? https : http;
    const req = lib.request(
      url,
      {
        method,
        headers: { ...BROWSER_HEADERS, ...headers },
        timeout: timeoutMs,
      },
      (res) => {
        if (
          redirect === "follow" &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          fetchResponse(next, {
            ...options,
            maxRedirects: maxRedirects - 1,
          }).then(
            (v) => finish(null, v),
            (e) => finish(e)
          );
          return;
        }

        const chunks = [];
        let total = 0;
        let aborted = false;
        res.on("data", (chunk) => {
          if (aborted) return;
          total += chunk.length;
          if (total > maxBytes) {
            aborted = true;
            req.destroy();
            finish(new Error(`Response exceeds maxBytes (${maxBytes})`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (aborted) return;
          finish(null, {
            statusCode: res.statusCode || 0,
            headers: res.headers,
            buffer: Buffer.concat(chunks),
            url,
          });
        });
        res.on("error", (err) => finish(err));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      finish(new Error("timeout"));
    });
    req.on("error", (err) => finish(err));
    req.end();
  });
}

async function fetchHtml(url) {
  const res = await fetchResponse(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    maxBytes: MAX_HTML_BYTES,
  });
  return {
    statusCode: res.statusCode,
    url: res.url,
    html: res.buffer.toString("utf8"),
  };
}

async function fetchImage(url, referer) {
  const res = await fetchResponse(url, {
    headers: {
      // Chrome UA + AVIF accept makes some CDNs return tiny AVIF (~2KB).
      // Force raster formats with usable byte size for gallery photos.
      "User-Agent":
        "Mozilla/5.0 (compatible; MobeeOfficialImageBot/1.0; +https://mobee.am)",
      Accept: "image/jpeg,image/png,image/webp,image/gif",
      Referer: referer || "https://www.google.com/",
    },
    maxBytes: MAX_IMAGE_BYTES,
  });
  return {
    statusCode: res.statusCode,
    contentType: String(res.headers["content-type"] || ""),
    buffer: res.buffer,
    url: res.url,
  };
}

async function headRequest(url) {
  try {
    const res = await fetchResponse(url, {
      method: "HEAD",
      headers: { Accept: "*/*" },
      timeoutMs: 15000,
      maxBytes: 64 * 1024,
    });
    return {
      ok: res.statusCode >= 200 && res.statusCode < 400,
      statusCode: res.statusCode,
      contentType: String(res.headers["content-type"] || ""),
    };
  } catch (err) {
    return { ok: false, statusCode: null, error: err.message };
  }
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => run()
  );
  await Promise.all(runners);
  return results;
}

module.exports = {
  fetchHtml,
  fetchImage,
  headRequest,
  fetchResponse,
  mapPool,
  MAX_IMAGE_BYTES,
  DEFAULT_TIMEOUT_MS,
};
