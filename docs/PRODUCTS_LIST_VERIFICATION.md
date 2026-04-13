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
| Ֆիլտրեր. category, search, minPrice, maxPrice, colors, sizes, brand, sort, page, limit, lang | ✅ API-ում և query-builder-ում կիրառվում են |
| DB where. `published: true`, `deletedAt: null`, search/category/filter (new, featured, bestseller) | ✅ `query-builder.ts` |
| In-memory ֆիլտր. գին, բրենդ, գույն, չափ — `productsFindFilterService.filterProducts` | ✅ |
| **Պագինացիա.** `page` չէր օգտագործվում — միշտ վերադարձվում էին առաջին `limit` ապրանքները | ✅ **Ուղղված** `products-find.service.ts`-ում |

**Ուղղում.** `src/lib/services/products-find.service.ts` — պագինացիան այժմ `slice((page - 1) * limit, page * limit)`.

**Նշում.** Query executor-ը ԲԴ-ից վերցնում է առավելագույնը `limit * 10` ապրանք (in-memory ֆիլտր/սորտի համար). Այսինքն պագինացիան «ճիշտ» է առաջին 10 էջերի համար (limit=24 → 240 ապրանք); 11-րդ էջից դատարկ արդյունք — `total` և `totalPages` ճիշտ են, UI-ում «Հաջորդ» չի ցույց տրվի:

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
| ԲԴ. `take: limit * 10` — limit=9999 → 99990 ապրանք, ծանր query | ⚠️ Խորհուրդ. limit-ի առավելագույն արժեք (օր. 500–1000) API/query-executor-ում |
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
| Category not found. `buildWhereClause` → `where: null` → `products: []`, meta total 0 | ✅ |
| API failure. empty data + meta; boundary եթե throw | ✅ |
| Չկա առկա (out of stock). labels / inStock — ProductCard-ում ցուցադրում | ✅ (նորմալացում `inStock ?? true`) |

Սխալ/ոչ վալիդ ֆիլտրի արժեքներ — API-ում parse (օր. parseInt, parseFloat) կարող է NaN; արժե ստուգել և վերադարձնել 400 կամ default:

---

## 9. Ամփոփում

- **Ուղղված.** Պագինացիա — `products-find.service.ts`-ում օգտագործվում է `page` (slice offset).
- **Խորհուրդ.** limit-ի cap (օր. 500–1000) query-executor/API-ում; console.log → logger production-ում; E2E products էջի համար.
- **Աղբյուր.** `docs/SEARCH-FUNCTION.md`, `docs/PHOTOS_USAGE.md` — search և նկարների հոսք:

---

**Տարբերակ.** 1.0  
**Ամսաթիվ.** 2026-02-24
