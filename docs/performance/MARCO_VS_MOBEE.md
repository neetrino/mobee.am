# Marco vs Mobee — storefront performance audit

Date: 2026-08-26  
Reference: `c:\AI\marco.am` (source, not docs alone)  
Target: `c:\AI\mobee.am`

Classification:

- **ALREADY_PRESENT** — same idea exists and is production-usable
- **PARTIAL** — exists but weaker (short TTL, incomplete path, extra DB work)
- **MISSING** — Marco has it; Mobee does not
- **NOT_APPLICABLE** — Mobee has no equivalent surface (do not copy)

This audit does not change production behavior. Implementation follows in later phases.

---

## Architecture recipe (Marco)

1. Root layout stays static: no `cookies()` / `headers()`.
2. Public marketing HTML uses ISR / `force-static` with a default locale snapshot; the client re-localizes.
3. Hot catalog reads hit denormalized `ProductListingRow` / `ProductPdpRow`, not deep Prisma includes.
4. Redis `getCachedJson(key, ttl, fetcher)` with **24h TTL + write-time invalidation**.
5. Admin write → sync projection → scoped Redis delete → `revalidatePath` / `revalidateTag`.
6. Boot warmup via internal authenticated POST (bounded concurrency).
7. Client: session/list cache, intent prefetch, PLP card → PDP shell seed.

Mobee already has Redis list/detail/facet caches, a light-row PLP pipeline, hover PDP warm, and client list memory cache. The gaps that still make the storefront feel slow are: **dynamic root layout**, **uncapped PLP candidate scan**, **short TTLs**, **no read-model**, **no warmup**.

---

## Baseline (this machine, 2026-08-26, `http://localhost:3000`)

Dev server already warm (webpack). Times are `Invoke-WebRequest` round-trip, not lab Lighthouse.

| Surface | Cold | Warm (repeat) |
|---------|------|----------------|
| `GET /` HTML | 4411 ms | 595–721 ms |
| `GET /shop` HTML | 2422 ms | 387–415 ms |
| `GET /api/v1/products` default | 146 ms | 80–95 ms |
| `GET /api/v1/products?filter=featured` | 2456 ms | 102–104 ms |
| `GET /api/v1/products/filters` | 1222 ms | 86–294 ms |
| `GET /api/v1/categories/tree` | 118 ms | 85–98 ms |
| `GET /api/v1/products/{slug}` | 3553 ms | 253–442 ms |
| `GET /products/{slug}` HTML | 6857 ms | 280–323 ms |
| `GET /about` HTML | 1230 ms | 184–238 ms |

Sample PDP slug: `hisense-wf1i6022bwu-6`.

Interpretation: default PLP API is already decent when Redis/memory hits. **Homepage HTML, featured PLP miss, PDP miss, and filter miss** still pay a heavy origin/DB path. Root `cookies()`/`headers()` keep every HTML document dynamic.

---

## Checklist vs Marco

### A. Static / ISR (layout + public pages)

| Item | Status | Notes |
|------|--------|--------|
| Root layout without `cookies()` / `headers()` | **MISSING** | `src/app/layout.tsx` reads `shop_language` cookie + `x-mobee-admin-route` header and loads the category tree. |
| Default locale + beforeInteractive lang script | **MISSING** | Language is SSR-from-cookie. Client already hydrates from `localStorage` (`UiLanguageProvider`). |
| Home `revalidate` / `force-static` | **MISSING** | `src/app/page.tsx` calls `cookies()` and fetches strip + hero. No `revalidate`. |
| Shop / PLP HTML not cookie-gated | **PARTIAL** | `/shop` streams catalog (good) but still `cookies()` in page + `ShopCatalogSection`. |
| PDP HTML not cookie-gated | **PARTIAL** | `products/[slug]/page.tsx` uses cookies for locale then `getCachedProductBySlug`. |
| About / legal client pages | **ALREADY_PRESENT** | `'use client'` + `useTranslation` (about, terms, …). Still dynamic because of root layout. |
| Public brands directory page | **NOT_APPLICABLE** | No storefront `/brands` PLP (admin brands only). |
| `fetch cache: 'no-store'` on public GETs | **PARTIAL** | `src/lib/api-client/http-methods.ts` forces `no-store` for server fetches. |
| `dynamic = 'force-dynamic'` on PDP API | **PARTIAL** | `src/app/api/v1/products/[slug]/route.ts` (and related/reviews) force-dynamic even on Redis hit. |
| Middleware forcing public HTML dynamic | **ALREADY_PRESENT** | Public HTML is `NextResponse.next()`. Matcher is admin + `/api/v1/*`. |

### B. Read-model (PLP)

| Item | Status | Notes |
|------|--------|--------|
| `ProductListingRow` table + GIN indexes | **MISSING** | Live `Product` + `ProductVariant` graph. |
| Listing query without deep includes | **PARTIAL** | Light-row scan then page-only `getListingInclude`. Residual: **uncapped candidate fetch** for price/Marco sort (`catalog-find.ts`). |
| Exact pagination (no result-window cap) | **ALREADY_PRESENT** | Exact total = filtered candidate length. Correct, expensive. |
| DB-level filter/sort on listing price | **MISSING** | Effective price is computed in memory (`catalog-price.ts`). |
| Marco-image demotion | **ALREADY_PRESENT** | Must be preserved (`productHasMarcoListingImage`). |
| Variant color/size filter semantics | **ALREADY_PRESENT** | Same published variant must match both (`variant-option-where.ts`). Projection must keep this. |
| Facets from projection | **PARTIAL** | Cached 120s; miss runs another uncapped facet light fetch with options. |
| Full rebuild / validate commands | **MISSING** | |

### C. Read-model (PDP)

| Item | Status | Notes |
|------|--------|--------|
| `ProductPdpRow` JSON payload | **MISSING** | `buildProductQuery` deep include + `transformProduct` every miss. |
| One indexed read for first paint | **PARTIAL** | Redis detail cache 120s (`products-slug-cached.ts`) + inflight dedupe. Miss is still the full graph. |
| Related products parallel / cached | **PARTIAL** | Related API `force-dynamic`; related may call `findAll` again. Browser related cache 3 min. |

### D. Single sync path

| Item | Status | Notes |
|------|--------|--------|
| Incremental projection rebuild after product write | **MISSING** | `revalidateProductCache` only Redis-pattern-deletes + `revalidatePath`. |
| Brand / category / attribute / discount settings → affected rows | **PARTIAL** | Same broad `invalidateCatalogCaches()` (`products:*`). No projection. |
| Hidden drift prevention (validate command) | **MISSING** | |

### E. Redis read-through

| Item | Status | Notes |
|------|--------|--------|
| Shared `getCachedJson` | **MISSING** | Hand-rolled get/parse/setex per module. |
| Upstash `automaticDeserialization: false` | **MISSING** | `cache.service.ts` may auto-parse JSON and break string `.length` checks. |
| Versioned keys `cache:products:plp:v1:` | **PARTIAL** | `products:v4`, `products:detail:v1`, `products:filters:v2`, `categories:tree:v2`. |
| Long TTL (24h) + invalidation | **PARTIAL** | List 120s / featured 600s / detail 120s / facets 120s / categories 300s. |
| Single-flight on miss | **PARTIAL** | PDP only (`inflightByKey`). PLP can stampede. |
| Skip cache for compare `ids` | **PARTIAL** | Keys include `ids`; still cached. |

### F. Invalidation

| Item | Status | Notes |
|------|--------|--------|
| Central `invalidateProductReadCaches` | **PARTIAL** | `invalidateCatalogCaches()` wipes `products:*` + discount key. |
| Scoped PLP vs PDP vs categories vs home | **MISSING** | Broad wildcard. Acceptable if keys are prefixed; still heavier than needed. |
| `revalidateTag` producers | **PARTIAL** | Tags written on admin update; **no matching `unstable_cache` / `cacheTag` readers**. |
| Admin change visible immediately | **PARTIAL** | Redis wipe is immediate; client session caches (3–120s) are not purged. ISR never primed because pages are dynamic. |

### G. Homepage

| Item | Status | Notes |
|------|--------|--------|
| Above-the-fold in first HTML | **PARTIAL** | Hero + category strip SSR; rails in `Suspense`. Layout cookies block static HTML. |
| Parallel independent rails | **ALREADY_PRESENT** | `Promise.all` for strip+hero; rails `Promise.all` featured + special offers. |
| Cached home datasets | **PARTIAL** | Rails share list Redis (short TTL). Hero hits `settings` every request. |
| Duplicate product/category queries | **PARTIAL** | Root layout category tree + home strip + (later) client tree refetch if locale differs. |

### H. PLP server

| Item | Status | Notes |
|------|--------|--------|
| Header/shell immediate + streamed body | **ALREADY_PRESENT** | `/shop` Suspense filters + catalog. |
| Redis cached default PLP | **ALREADY_PRESENT** | Shared key with API. Short TTL. |
| No in-memory slice of thousands of full Product objects | **PARTIAL** | Light rows, then full include for **page ids only**. Light scan still loads every candidate. |
| Parallel listing + facets | **ALREADY_PRESENT** | Separate cached endpoints / RSC shells. |

### I. Client navigation

| Item | Status | Notes |
|------|--------|--------|
| `@tanstack/react-query` | **MISSING** | Not in `package.json`. Custom Map caches cover the same job. **Not adding RQ** unless a gap remains: existing list + card caches already provide `initialData` / keep-previous (`refreshing` vs empty skeleton). |
| PLP client cache + keep previous rows | **ALREADY_PRESENT** | `product-list-client-cache.ts` 120s; `useShopCatalog` sets `refreshing` when rows exist. |
| Soft URL filter/pagination (no full reload) | **ALREADY_PRESENT** | searchParams + client fetch. |
| In-flight dedupe | **PARTIAL** | Prefetch URL set; listing request id ignores stale responses. |

### J. Prefetch

| Item | Status | Notes |
|------|--------|--------|
| pointerdown / focus / hover | **ALREADY_PRESENT** | `product-card-nav.ts`, `storefront-prefetch.ts`. |
| Idle header route warm | **ALREADY_PRESENT** | `useHeaderRoutePrefetch.ts`. |
| Adjacent PLP page | **ALREADY_PRESENT** | `usePrefetchAdjacentProductListPages.ts`. |
| Viewport PDP prefetch | **MISSING** | No IntersectionObserver slug warm. |
| saveData / 2g guard | **ALREADY_PRESENT** | `shouldAllowStorefrontPrefetch`. |

### K. PLP → PDP instant shell

| Item | Status | Notes |
|------|--------|--------|
| Seed title/image/price/stock from card | **ALREADY_PRESENT** | `product-card-cache.ts` + `useProductFetch` + `ProductPageClient` shell. |
| Viewport sync into PDP cache | **MISSING** | Marco `use-plp-viewport-pdp-sync`. |
| Disabled actions until full PDP | **ALREADY_PRESENT** | Shell has no buy/variant UI until full product. |

### L. Warmup

| Item | Status | Notes |
|------|--------|--------|
| `instrumentation.ts` delayed loopback POST | **MISSING** | Only DNS ipv4first + env assert. |
| Internal warm route + secret / process token | **MISSING** | |
| Bounded PDP concurrency | **MISSING** | |
| Env: `CACHE_WARM_ON_START`, `WARMUP_INTERNAL_SECRET`, delay | **MISSING** | `.env.example` has Upstash only. |

### M. Images

| Item | Status | Notes |
|------|--------|--------|
| `next/image` + `sizes` | **ALREADY_PRESENT** | Cards, hero, about, PDP. |
| `priority` only for LCP slots | **ALREADY_PRESENT** | `SHOP_LISTING_EAGER_IMAGE_CARD_COUNT = 6`; hero first slide. Slightly more eager than Marco PLP (2/4) but acceptable. |
| R2/CDN delivery | **ALREADY_PRESENT** | R2 public URL. |
| Avoid client-side image recompress on storefront | **ALREADY_PRESENT** | `browser-image-compression` is admin/upload, not PLP. |

### N. Database indexes (operational catalog)

| Item | Status | Notes |
|------|--------|--------|
| Product published / brand / category / variant stock indexes | **ALREADY_PRESENT** | `schema.prisma` + `20260625120000_admin_perf_indexes`. |
| Listing-price / facet GIN on projection | **MISSING** | No materialized price/tokens. |
| Trigram search | **MISSING** | `ILIKE`/`contains` on title/subtitle/SKU. Acceptable until search volume requires `pg_trgm`. |

### O. Performance budget scripts

| Item | Status | Notes |
|------|--------|--------|
| `check:perf-env` | **MISSING** | |
| `check:perf-budget` | **MISSING** | |
| `rebuild:plp-read-model` / `rebuild:pdp-read-model` | **MISSING** | |

---

## Mobee-specific constraints (do not flatten)

1. **Variants** — listing image/color follows `findListingDisplayVariant`; price uses `pickListingPriceVariant` / `priceOnRequest`.
2. **Discounts** — product > category > brand > global (`resolveAppliedDiscountPercent`). Listing `priceSort` must be the **min effective** published-variant price.
3. **Marco demotion** — default sort and `filter=new` exclude/demote Marco-hosted listing images.
4. **Bestseller** — ranked from `orderItem` quantities, not a static flag. Do not freeze rank on the row without a rebuild path.
5. **Color+size** — must match **one** published variant (no cross-variant AND).
6. **i18n** — `hy` default; cache keys include `lang`.
7. **No public brands PLP** — skip Marco brand-directory page; still keep brand facets + brand filter.

---

## Implementation order (after this audit)

1. Unblock static/ISR (layout cookies/headers).
2. Materialize listing + PDP rows; query them on the hot path; keep existing card/PDP transformers for correctness.
3. `getCachedJson` + 24h TTL + write-time invalidation + sync hook on every catalog admin write.
4. Warmup (bounded).
5. Viewport PDP prefetch (client caches already exist).

---

## Decision: React Query

**Not adding `@tanstack/react-query`.** Mobee already has list/card/related client caches with keep-previous behavior. Adding a client library would duplicate that layer without unblocking TTFB (the bottleneck is SSR cookies + DB on miss).
