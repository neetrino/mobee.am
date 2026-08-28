"use strict";

const SOURCE_NAME = "marco";
const LOCALES_FALLBACK = ["en", "hy", "ru"];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function upgradeThTdSpecsTable(html) {
  if (!html.includes("product-specs") || !/<th\b/i.test(html)) return html;
  return html.replace(
    /<tr>\s*<th>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi,
    (_match, label, value) =>
      `<tr class="spec-row"><td class="spec-label">${String(label).trim()}</td><td class="spec-value">${String(value).trim()}</td></tr>`
  );
}

function descriptionToHtml(description) {
  if (description == null) return null;
  if (typeof description === "string") {
    const trimmed = description.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("<")) return upgradeThTdSpecsTable(trimmed);
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return descriptionToHtml(JSON.parse(trimmed));
      } catch {
        return `<p>${escapeHtml(trimmed)}</p>`;
      }
    }
    return `<p>${escapeHtml(trimmed)}</p>`;
  }
  if (Array.isArray(description)) {
    const rows = description
      .filter((item) => item && (item.title || item.value))
      .map(
        (item) =>
          `<tr class="spec-row"><td class="spec-label">${escapeHtml(
            String(item.title || "").trim()
          )}</td><td class="spec-value">${escapeHtml(
            String(item.value || "").trim()
          )}</td></tr>`
      )
      .join("");
    if (!rows) return null;
    return `<table class="product-specs"><tbody>${rows}</tbody></table>`;
  }
  if (typeof description === "object") {
    if (typeof description.html === "string") return description.html;
    if (Array.isArray(description.items)) {
      return descriptionToHtml(description.items);
    }
  }
  return null;
}

function pickTitle(translations) {
  const rows = translations || [];
  return (
    rows.find((t) => t.locale === "hy")?.title ||
    rows.find((t) => t.locale === "en")?.title ||
    rows.find((t) => t.title)?.title ||
    ""
  );
}

function htmlByLocaleFromMarco(translations) {
  const map = new Map();
  for (const row of translations || []) {
    const html = descriptionToHtml(row.description);
    if (html) map.set(row.locale, html);
  }
  return map;
}

function pickMarcoHtml(htmlByLocale, locale) {
  const own = htmlByLocale.get(locale);
  if (own) return { html: own, fromLocale: locale };
  for (const loc of LOCALES_FALLBACK) {
    const html = htmlByLocale.get(loc);
    if (html) return { html, fromLocale: loc };
  }
  for (const [loc, html] of htmlByLocale) {
    if (html) return { html, fromLocale: loc };
  }
  return null;
}

function resolveMarcoProductIdFromSourcePids(sourcePids) {
  for (const pid of sourcePids) {
    const match = String(pid).match(/^marco-product-(.+)-default$/);
    if (match) return match[1];
  }
  return null;
}

function resolveMarcoId(sourcePids, variantToProduct) {
  const candidates = new Set();
  const fromDefault = resolveMarcoProductIdFromSourcePids(sourcePids);
  if (fromDefault) candidates.add(fromDefault);
  for (const pid of sourcePids) {
    if (variantToProduct.has(pid)) candidates.add(variantToProduct.get(pid));
  }
  return [...candidates];
}

function planProduct(product, marcoRow) {
  const translations = product.translations || [];
  const htmlByLocale = htmlByLocaleFromMarco(marcoRow?.translations);
  if (htmlByLocale.size === 0) {
    return { reason: "NO_MARCO_DESCRIPTION", updates: [] };
  }

  const updates = [];
  for (const tr of translations) {
    const picked = pickMarcoHtml(htmlByLocale, tr.locale);
    if (!picked) continue;
    const oldHtml = typeof tr.descriptionHtml === "string" ? tr.descriptionHtml : "";
    const identical = oldHtml === picked.html;
    updates.push({
      translationId: tr.id,
      locale: tr.locale,
      slug: tr.slug,
      action: identical ? "SKIP_IDENTICAL" : "UPDATE",
      fromLocale: picked.fromLocale,
      oldLength: oldHtml.length,
      newLength: picked.html.length,
      html: identical ? undefined : picked.html,
    });
  }

  const willWrite = updates.some((u) => u.action === "UPDATE");
  return {
    reason: willWrite ? "UPDATE" : "ALREADY_IDENTICAL",
    updates,
  };
}

function applyLimit(plans, limit) {
  let writable = plans.filter((p) => p.reason === "UPDATE");
  if (limit) writable = writable.slice(0, limit);
  const writableIds = new Set(writable.map((p) => p.productId));
  for (const plan of plans) {
    if (plan.reason === "UPDATE" && !writableIds.has(plan.productId)) {
      plan.reason = "LIMIT_SKIPPED";
    }
  }
  return writable;
}

function summarizePlans(plans, writable) {
  const counts = {
    UPDATE: 0,
    ALREADY_IDENTICAL: 0,
    NO_MARCO_MATCH: 0,
    AMBIGUOUS_MATCH: 0,
    NO_MARCO_DESCRIPTION: 0,
    LIMIT_SKIPPED: 0,
    translationsToUpdate: 0,
    translationsIdentical: 0,
    planned: writable.length,
  };
  for (const plan of plans) {
    counts[plan.reason] = (counts[plan.reason] || 0) + 1;
    if (plan.reason !== "UPDATE") continue;
    for (const u of plan.updates) {
      if (u.action === "UPDATE") counts.translationsToUpdate += 1;
      if (u.action === "SKIP_IDENTICAL") counts.translationsIdentical += 1;
    }
  }
  return counts;
}

function serializePlan(plan) {
  return {
    productId: plan.productId,
    marcoProductId: plan.marcoProductId,
    title: plan.title,
    published: plan.published,
    reason: plan.reason,
    updates: (plan.updates || []).map((u) => ({
      locale: u.locale,
      slug: u.slug,
      action: u.action,
      fromLocale: u.fromLocale,
      oldLength: u.oldLength,
      newLength: u.newLength,
    })),
  };
}

async function applyUpdates(mobee, plans) {
  const writes = [];
  for (const plan of plans) {
    for (const u of plan.updates) {
      if (u.action === "UPDATE") writes.push(u);
    }
  }
  if (writes.length === 0) return 0;

  await mobee.query("BEGIN");
  try {
    for (const u of writes) {
      await mobee.query(
        `UPDATE product_translations SET "descriptionHtml" = $1 WHERE id = $2`,
        [u.html, u.translationId]
      );
    }
    await mobee.query("COMMIT");
  } catch (err) {
    await mobee.query("ROLLBACK");
    throw err;
  }
  return writes.length;
}

module.exports = {
  SOURCE_NAME,
  pickTitle,
  resolveMarcoId,
  planProduct,
  applyLimit,
  summarizePlans,
  serializePlan,
  applyUpdates,
};
