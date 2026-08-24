"use strict";

/**
 * Headless fallback for approved Hisense QR/support pages only.
 * Concurrency must remain 1 at the call site.
 */

let playwrightModule = null;

async function loadPlaywright() {
  if (playwrightModule) return playwrightModule;
  try {
    playwrightModule = require("playwright");
    return playwrightModule;
  } catch {
    return null;
  }
}

/**
 * @param {string} pageUrl
 * @param {string} model
 * @returns {Promise<{ html: string|null, candidates: object[], usedBrowser: boolean, reason?: string }>}
 */
async function extractWithHeadlessBrowser(pageUrl, model) {
  if (!/qrcode\.hisense\.com/i.test(pageUrl)) {
    return {
      html: null,
      candidates: [],
      usedBrowser: false,
      reason: "NOT_QR_SUPPORT_URL",
    };
  }

  const pw = await loadPlaywright();
  if (!pw) {
    return {
      html: null,
      candidates: [],
      usedBrowser: false,
      reason: "PLAYWRIGHT_NOT_INSTALLED",
    };
  }

  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const networkCandidates = [];

  page.on("response", async (response) => {
    try {
      const url = response.url();
      const ct = String(response.headers()["content-type"] || "").toLowerCase();
      if (ct.startsWith("image/") || /\/qr-product\//i.test(url)) {
        if (/hisense\.com|gorenje\.com|cdn\.hisense\.ru/i.test(url)) {
          networkCandidates.push({
            url,
            source: "HEADLESS_PRODUCT_GALLERY:network-image",
            jsonPath: "network:image",
            galleryComponentId: "headless-network",
          });
        }
      }
      if (ct.includes("json")) {
        const text = await response.text();
        const re =
          /https?:\\\/\\\/[^"\\]+|https?:\/\/[^"\\\s]+/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
          const decoded = m[0].replace(/\\\//g, "/");
          if (
            /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(decoded) &&
            /hisense\.com|gorenje\.com|cdn\.hisense\.ru/i.test(decoded)
          ) {
            networkCandidates.push({
              url: decoded,
              source: "HEADLESS_PRODUCT_GALLERY:network-json",
              jsonPath: "network:json",
              galleryComponentId: "headless-network-json",
            });
          }
        }
      }
    } catch {
      /* ignore */
    }
  });

  try {
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 45000 });
    const html = await page.content();
    const modelOk = new RegExp(String(model || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
      html
    );
    if (!modelOk) {
      await browser.close();
      return {
        html,
        candidates: [],
        usedBrowser: true,
        reason: "MODEL_NOT_CONFIRMED_IN_DOM",
      };
    }

    const domUrls = await page.$$eval(
      "#MainContent_ProductImage, #MainContent_ProductImageContainer img, .product-image img",
      (nodes) =>
        nodes
          .map((n) => n.getAttribute("src") || n.getAttribute("data-src"))
          .filter(Boolean)
    );

    const candidates = [
      ...domUrls.map((url) => ({
        url,
        source: "HEADLESS_PRODUCT_GALLERY:dom",
        jsonPath: "#MainContent_ProductImage",
        galleryComponentId: "MainContent_ProductImageContainer",
      })),
      ...networkCandidates,
    ];

    await browser.close();
    return { html, candidates, usedBrowser: true };
  } catch (err) {
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
    return {
      html: null,
      candidates: [],
      usedBrowser: true,
      reason: `HEADLESS_ERROR:${err.message}`,
    };
  }
}

module.exports = {
  extractWithHeadlessBrowser,
  loadPlaywright,
};
