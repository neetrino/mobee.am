# Ստուգում. ապրանքների ցանկի ստացում և ցուցադրում

Փաստաթուղթը ամփոփում է ապրանքների ցանկի հոսքի ստուգումը և հայտնաբերած խնդիրները/ուղղումները։

---

## 1. Տվյալների աղբյուր

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| ԲԴ. Prisma + PostgreSQL (Neon), `shared/db/client.ts` — `DATABASE_URL` | ✅ Կայուն |
| API. `GET /api/v1/products` — filters, pagination, `productsService.findAll` | ✅ Աշխատում է |
| Աղբյուր. Միայն ԲԴ (ոչ CRM/պահեստի արտաքին API) | ✅ Ոչ խնդիր |

**Ստուգել.** `DATABASE_URL` և (անհրաժեշտության դեպքում) `DIRECT_URL` սահմանված են `.env`-ում (տե՛ս `.env.example`):

---

## 2. Հարցումների կատարում

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| Ֆիլտրեր. category, search, minPrice, maxPrice, colors, sizes, brand, sort, page, limit, lang | ✅ Canonical `normalizeCatalogQuery` |
| DB where. published, search, category tree, brand, color/size (same variant), filter | ✅ `src/lib/catalog/build-catalog-where.ts` |
| Effective price filter/sort | ✅ two-phase light rows, առանց 200/250 cap |
| Պագինացիա. `meta.total` / `totalPages` ամբողջ համընկնող հավաքածուից | ✅ `selectCatalogPage` |

Over-fetch `limit * 10` and in-memory pagination are removed. Unknown category slug → HTTP 400 (same for list and facets).

---

## 3. Ցանկի ռենդերինգ

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| Էջ. `src/app/products/page.tsx` — server component, `getProducts()` → `ProductsGrid` | ✅ |
| Նորմալացում. `inStock`, `image`, `compareAtPrice`, `colors`, `labels` — page-ում fallback արժեքներ | ✅ |
| `ProductsGrid`. viewMode (list / grid-2 / grid-3), client-side sort (price, name) | ✅ |
| `ProductCard`. image, title, price, wishlist/compare/cart, labels | ✅ |
| Դատարկ ցանկ. «No products found» / «noProductsFound» | ✅ |

Պропавших ապրանքների կամ սխալ դաշտերի դեպքում ստուգել API response-ի ձևաչափը և `products-find-transform.service.ts`-ի map-ը:

---

## 4. Պագինացիա և «անվերջ» scroll

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| Պագինացիա. հղումներ «Previous» / «Next», «Page X of Y» — `buildPaginationUrl(page ± 1)` | ✅ |
| Default `perPage`. 9999 (ցույց տալ բոլորը) — պագինացիայի UI-ն մի էջի դեպքում չի ցույց տրվում | ✅ |
| Անվերջ scroll. չկա — միայն link-based պագինացիա | — |

---

## 5. Սխալների մշակում

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| Error boundary. `src/app/products/error.tsx` — «Failed to load products», «Try again», «Home» | ✅ |
| `getProducts`. !res.ok → throw; parse/array սխալ → `{ data: [], meta: { total: 0, ... } }`; catch → նույնը + log | ✅ |
| API route. catch → JSON problem-detail (type, title, status, detail, instance), status 500 կամ error.status | ✅ |
| Query executor. product_attributes / variant attributes սխալներ — fallback query-ներ (без problem table/column) | ✅ |

---

## 6. Արտադրողականություն և բեռնման ժամանակ

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| ԲԴ. light candidate rows + page-only relations, `limit` ≤ 200 | ✅ Phase 1 |
| Էջի default 9999. բոլոր ապրանքները մի էջում — ժամանակը կախված է քանակից | ℹ️ |

---

## 7. Բրաուզեր/սարք

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| UI. Tailwind, responsive (grid, MobileFiltersDrawer) | ✅ |
| Ստուգում. Chrome, Firefox, Safari, mobile — ձեռքով / E2E | 📋 Խորհուրդ. ավելացնել E2E (Playwright/Cypress) products էջի համար |

---

## 8. Ծայրահեղ դեպքեր

| Խնդիր | Կարգավիճակ |
|--------|-------------|
| Դատարկ ցանկ. «No products found» | ✅ |
| Category not found. գոնե մեկ unknown slug → 400 problem+json | ✅ |
| API failure. DB outage → 5xx problem+json (ոչ դատարկ catalog) | ✅ |
| Չկա առկա (out of stock). labels / inStock — ProductCard-ում ցուցադրում | ✅ (նորմալացում `inStock ?? true`) |

Սխալ/ոչ վալիդ ֆիլտրի արժեքներ — խիստ HTTP parse; 400 `application/problem+json`։

---

## 9. Ամփոփում

- **Ուղղված.** Պագինացիա — `products-find.service.ts`-ում օգտագործվում է `page` (slice offset).
- **Խորհուրդ.** limit-ի cap (օր. 500–1000) query-executor/API-ում; console.log → logger production-ում; E2E products էջի համար.
- **Աղբյուր.** `docs/SEARCH-FUNCTION.md`, `docs/PHOTOS_USAGE.md` — search և նկարների հոսք:

---

**Տարբերակ.** 1.0  
**Ամսաթիվ.** 2026-02-24
