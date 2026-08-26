# Mobee storefront performance architecture

Date: 2026-08-26  
Reference: Marco.am patterns (`getCachedJson`, listing/PDP projections, 24h Redis + write invalidation, warmup).  
Audit snapshot: `docs/performance/MARCO_VS_MOBEE.md`.

This document describes **what Mobee actually runs after the port**. Catalog behavior (variants, discounts, Marco-image demotion, color+size on the same published variant, `hy/en/ru/ka`) is unchanged.

---

## Recipe (order of layers)

1. **Static / ISR** — public HTML is not cookie-gated. Personalized pages stay dynamic.
2. **Cheap read queries** — `ProductListingRow` / `ProductPdpRow` projections.
3. **Redis read-through** — `getCachedJson(key, ttl, fetcher)`, 24h TTL.
4. **Warmup** — bounded internal POST after boot.
5. **Client cache / prefetch** — existing list memory cache, card seed, hover + viewport PDP warm. **No React Query** (Mobee already has keep-previous list behavior).

Write path (canonical, one sync):

```
admin/checkout mutation
  → DB transaction
  → rebuild affected ProductListingRow + ProductPdpRow
  → Redis invalidate (scoped prefixes)
  → revalidatePath / revalidateTag
```

Cache hit → no Postgres. Cache miss → indexed projection (+ page-sized Product include for cards). Admin write → immediate freshness; do not wait for TTL.

---

## Static / ISR

| Surface | Strategy |
|---------|----------|
| Root layout | No `cookies()` / `headers()`. Default locale `hy`. Category tree from **`unstable_cache`** (tag `categories-tree`) — not Upstash — so informational pages stay static. |
| Home | `dynamic = 'force-static'`, `revalidate = 300`. Hero + category strip + featured rails fetched in parallel on the server. |
| Shop HTML | `revalidate = 300`. Catalog section streams server list (same Redis key as `GET /api/v1/products`). `searchParams` keep filtered PLP request-specific. |
| PDP HTML | `revalidate = 300` per slug. Default-locale payload in first HTML; client re-localizes. |
| Account / cart / checkout / admin | Dynamic (session, cart, mutations). |
| About / legal | Client i18n; no longer forced dynamic by the root layout. |

After catalog writes: `revalidatePath("/")`, `/shop`, `/products`, `/products/[slug]`.

---

## Read models

### `ProductListingRow` (`product_listing_rows`)

One row per **product × locale**. Used for filter, sort, count, and facets.

Includes effective listing price (`priceSort`), Marco demotion flag, stock/inStock of the listing price variant, category id/slug arrays (ancestors expanded), color/size tokens, and **`variantComboTokens`** (`c:{color}|s:{size}` per published variant) so color **and** size never match across two variants.

PLP hot path:

1. Indexed `where` + `orderBy` + `count` on the projection.
2. Load **only the current page** of `productId`s.
3. Existing `executeProductQuery` + `transformProducts` for card JSON (variant display, color listing image, discounts).

Bestseller rank still comes from `orderItem` quantities (not a frozen flag). `filter=new` = `productCreatedAt` last 30 days **and** `hasMarcoListingImage = false`.

If the table is empty, catalog falls back to the old light-row scan (`read-model-ready.ts`).

### `ProductPdpRow` (`product_pdp_rows`)

One JSON payload per product × locale, same shape as `transformProduct`. First PDP render is one indexed read (`slugs` GIN). Related products stay a separate cached request.

---

## Sync

| Trigger | Action |
|---------|--------|
| Product create/update | `syncProductListingReadModel(productId)` (listing + PDP) |
| Product delete / unpublish | `deleteProductListingReadModel` |
| Brand write | `syncProductListingReadModelByBrand` |
| Category write | full listing rebuild (ancestry/slugs) |
| Attribute write/delete | full rebuild (tokens) |
| Settings / discounts | full rebuild |
| Admin inventory adjust | `syncProductListingReadModelByVariantIds` |
| Checkout stock decrement | same, after the order transaction commits |

Commands:

- `pnpm rebuild:plp-read-model` — listing + PDP backfill
- `pnpm rebuild:pdp-read-model` — PDP only
- `pnpm validate:read-model` — published product count vs projection rows (exit 2 on drift)

---

## Redis

Helper: `src/lib/services/read-through-json-cache.ts` → `getCachedJson`.

TTL: `STOREFRONT_CACHE_TTL_SEC = 86400`. Versioned keys:

- `cache:products:plp:v1:...`
- `cache:products:pdp:v1:...`
- `cache:products:filters:v1:...`
- `cache:categories:...`
- `cache:home:hero:v1`

Invalidation (no global `*`):

- `invalidateProductsPlpCache` / `invalidateProductPdpCache`
- `invalidateCategoryCaches` / `invalidateHomeHeroCache`
- `invalidateProductReadCaches` / `invalidateCatalogReadCaches`

HTTP `Cache-Control` on JSON APIs stays short (`s-maxage` ~60s). Freshness for origin is Redis + invalidation, not CDN TTL.

---

## Warmup

`instrumentation.ts` (Node runtime) delays then POSTs `/api/v1/internal/warm-storefront-listing`.

Auth: process-local `x-warmup-token` and/or `WARMUP_INTERNAL_SECRET` (`x-warmup-secret`). CSRF-exempt. Bounded PDP concurrency = 4, top 24 listing slugs × `hy/en/ru`.

If the listing table is empty, warmup rebuilds the projection first.

Env (see `.env.example`): `CACHE_WARM_ON_START`, `HOME_CACHE_WARMUP`, `HOME_CACHE_WARMUP_DELAY_MS`, `WARMUP_INTERNAL_SECRET`.

---

## Client navigation

- `useShopCatalog`: in-memory list cache + keep previous rows while `refreshing`.
- Adjacent page prefetch.
- Product card session cache seeds PDP shell (`useProductFetch`).
- Pointer/hover prefetch (existing nav handlers).
- Viewport PDP JSON prefetch (`usePlpViewportPdpSync`, max 8, `data-plp-slug` on grid cards).

Do not prefetch the whole catalog.

---

## Images

- `next/image` + AVIF/WebP (`next.config.js`).
- R2 / `NEXT_PUBLIC_PRODUCT_CARD_DISPLAY_IMAGE_URL` remote patterns.
- Only the first N shop cards (`SHOP_LISTING_EAGER_IMAGE_CARD_COUNT = 6`) and the PDP LCP image use `priority`.
- Card `sizes`: `(max-width: 768px) 78vw, (max-width: 1200px) 35vw, 212px`.

---

## Database indexes (projections)

Listing: unique `(productId, locale)`, `(locale, slug)`; btree for default sort (Marco flag + `productCreatedAt`), brand, featured, price; GIN on `categoryIds`, `categorySlugs`, `colorTokens`, `sizeTokens`, `variantComboTokens`.

PDP: unique `(productId, locale)`; btree `(locale, slug)`; GIN on `slugs`.

No generic “index everything” on the live `Product` graph; hot storefront reads should miss Postgres entirely.

---

## Budgets

- `pnpm check:perf-env` — pooler URL + Upstash credentials.
- `pnpm check:perf-budget` — HTML TTFB + first-load JS vs `BASE_URL`.

Target: warm origin JSON **< 200 ms** (Redis hits much lower). See `docs/performance/PERFORMANCE_RESULTS.md`.
