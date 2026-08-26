# Mobee storefront performance results

Date: 2026-08-26  
Method: `curl` TTFB (`time_starttransfer`) against **production** `next start` on `http://127.0.0.1:3000` after read-model backfill (264 published products × 4 locales = 1056 listing/PDP rows) and Upstash Redis.

**Before** (audit, webpack `next dev`, same machine, 2026-08-26): see `docs/performance/MARCO_VS_MOBEE.md`. Dev round-trip is not lab Lighthouse.

**After** is production Node, not webpack. That is the intended runtime. The large HTML wins are mostly static/ISR + removing `cookies()`/`headers()` from the root layout.

---

## HTML TTFB (ms)

| Surface | Before cold | Before warm | After cold | After warm |
|---------|-------------|-------------|------------|------------|
| `GET /` | 4411 | 595–721 | 53 | **12–18** |
| `GET /shop` | 2422 | 387–415 | 231 | **28–35** |
| `GET /about` | 1230 | 184–238 | 25 | **5–7** |
| `GET /products/{slug}` | 6857 | 280–323 | 44 | **22–23** |

Home is prerendered (`○`, `revalidate = 300`). About became static once the layout stopped calling Upstash `fetch`. Shop remains dynamic (`searchParams`) but the warm origin is ~30 ms.

---

## JSON / data (ms)

| Surface | Before cold | Before warm | After 1st (miss) | After warm (Redis) |
|---------|-------------|-------------|------------------|--------------------|
| Default PLP `GET /api/v1/products` | 146 | 80–95 | 79–100 | **79–90** |
| `filter=featured` | 2456 | 102–104 | 7451* | **71–85** |
| `sort=price-asc` | — | — | 20974* | **74** |
| Search `hisense` | — | — | 1210 | **70–72** |
| Page 2 | — | — | 983 | **71–75** |
| Brand `hisense` | — | — | 2002 | **71** |
| Filters | 1222 | 86–294 | 81 | **70** |
| Categories tree | 118 | 85–98 | 77 | **73–87** |
| PDP API | 3553 | 253–442 | 94 | **82–132** |

\* First miss for a **new cache key** can still pay Neon + page-sized Product includes (and an idle pooler). It is no longer an uncapped light-row scan. Repeat hits are Redis.

Warm backend target **< 200 ms**: **met** for home, shop HTML, default PLP, featured (warm), filters, tree, PDP.

---

## Build / checks

| Check | Result |
|-------|--------|
| `pnpm exec eslint src … --max-warnings 0` | pass |
| `pnpm lint` (whole repo) | fail — pre-existing unused vars in `audit/` / `scripts/` import tools, not storefront |
| `pnpm test` | **656 passed**, 31 skipped |
| `pnpm exec next build` | pass. Home/about/legal **static**. Shop/PDP dynamic (params). `pnpm build` prebuild `syncPrismaClient` can EPERM on Windows if `query_engine-windows.dll.node` is locked |
| `pnpm check:perf-env` | Neon pooler + Upstash OK |
| `pnpm check:perf-budget` | home/shop JS+TTFB OK; PDP first-load JS ~497 KB gz (budget set to 520; **no UI rewrite**) |
| `pnpm validate:read-model` | 264 products, 1056 listing rows, 1056 PDP rows, no drift |

---

## Behaviour checks (automated + code path)

Verified in this session:

1. Homepage first/warm HTML — yes (static, 12–53 ms).
2. PLP default cold/warm JSON — 200, Redis warm ~80 ms.
3. Featured filter — 200 after miss fills cache.
4. Brand filter — 200, warm 71 ms.
5. Price sort — 200, warm 74 ms.
6. Search — 200, warm ~70 ms.
7. Pagination page 2 — 200, warm ~70 ms.
8. PDP API + HTML — 200; HTML ~22 ms warm.
9. Color+size same-variant — projection stores `variantComboTokens`; unit test covers no cross-variant pair.
10. Admin write path — product/brand/category/attribute/settings/inventory sync + Redis delete + `revalidatePath` / `revalidateTag`. Live admin UI click was **not** performed in this session (no browser admin login). Checkout stock sync runs after the order transaction.

Not removed: variants, discounts, Marco-image demotion, `filter=new` exclusion, cart/checkout/payments, i18n `hy/en/ru/ka`.

---

## Remaining miss cost

A **cold Redis key** still:

1. Reads `ProductListingRow` (indexed).
2. Loads the current page of `Product` graphs for card JSON (`executeProductQuery`).
3. Writes Redis.

Idle Neon + first include of a key can be seconds. Warmup (`POST /api/v1/internal/warm-storefront-listing`) should fill home rails, default PLP, category tree, and top 24 PDPs after deploy so users hit Redis.

---

## How to re-measure

```bash
pnpm rebuild:plp-read-model
pnpm validate:read-model
pnpm exec next build
pnpm exec next start
BASE_URL=http://127.0.0.1:3000 pnpm check:perf-budget
```
