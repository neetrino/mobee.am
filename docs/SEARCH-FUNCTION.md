# Search on WhiteShop.am

This document describes catalog search and filters. **No external search engine is used** (Meilisearch, Algolia, etc.) — only Prisma and PostgreSQL.

---

## Current flow (Phase 1)

```
URL search params
→ parseCatalogHttpParams (strict HTTP validation)
→ normalizeCatalogQuery
→ buildCatalogWhere (Prisma)
→ light candidate rows (no result-window cap)
→ effective price filter + global sort
→ exact total + page IDs
→ full relations for the current page only
→ transform + cache (products:v4)
```

### HTTP validation

Invalid `page` / `limit` / `minPrice` / `maxPrice` / `sort` / `filter` → **400** `application/problem+json`.
If `category` contains at least one unknown slug (`phones,ghost`) → **400**; list and facets behave the same.
Partial numbers (`1abc`) and negative prices are rejected.

### DB `where`

- `published: true`, `deletedAt: null`
- `search` — `title`, `subtitle`, published variant `sku` (`contains`, `mode: insensitive`)
- `category` — category tree + locale fallback; unknown slug = 400
- `brand` — DB id, slug, localized name
- `colors` / `sizes` — same published variant
- `filter=new|featured|bestseller` (same semantics on list and facets; `new` excludes Marco listing images)
- `ids` constrains the candidate set but does not disable other filters

### Two-phase (not a Prisma field)

Effective listing price = `variant.price * (1 - appliedDiscount%)`.
Discount priority: product → category → brand → global.
Price filter/sort and Marco demotion run on light rows, without `limit * 10` / 200 / 250 caps.
Products without a display price (`priceOnRequest` / 0) are **last** for both `price-asc` and `price-desc`.

**Residual performance risk.** Default sort (Marco) and effective-price filter/sort require an uncapped light-row scan. Exact effective-price pagination in SQL is not possible without a materialized listing-price field.

### Facets

`GET /api/v1/products/filters` uses the same semantics, including `filter`.
Brand counts omit only the current `brand` filter, color counts omit `colors`, size counts omit `sizes`.
Color/size counts are **product-based** (one product is counted once per color/size).

### Cache

- List key prefix: `products:v4` (token order canonicalized)
- Facet key prefix: `products:filters:v2` (`filter` is part of the key)
- Invalidation: `invalidateCatalogCaches()` after product create/update/delete, discount, category/brand/attribute updates
- TTL is unchanged (120s list, 600s featured)
- A DB outage is **not** faked as an empty catalog and is **not** cached

### Code

| Location | Description |
|----------|-------------|
| `src/lib/catalog/` | Query model, where, price, sort, pagination, facets |
| `src/app/api/v1/products/route.ts` | List API (`search`, filters, `{ data, meta }`) |
| `src/app/api/v1/products/filters/route.ts` | Facets API |

Search/category **do not** enable over-fetch. `meta.total` is the exact size of the full matching set.
