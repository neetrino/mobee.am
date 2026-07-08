"use strict";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "hy-AM,hy;q=0.9,en;q=0.8,ru;q=0.7",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url, { sleepMs = 150, retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: DEFAULT_HEADERS, redirect: "follow" });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * (i + 1));
        continue;
      }
      const text = await res.text();
      if (sleepMs > 0) await sleep(sleepMs);
      return { url: res.url, status: res.status, text };
    } catch (e) {
      lastErr = e;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}

function decodeHtml(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

module.exports = { DEFAULT_HEADERS, sleep, fetchHtml, decodeHtml, stripTags };
