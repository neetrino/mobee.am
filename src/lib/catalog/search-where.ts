import type { Prisma } from "@white-shop/db";

const MAX_SEARCH_TOKENS = 8;

/**
 * Splits a search query into unique whitespace-separated tokens (order preserved).
 */
export function tokenizeSearchQuery(search: string): string[] {
  const tokens = search.trim().split(/\s+/).filter((token) => token.length > 0);
  return [...new Set(tokens)].slice(0, MAX_SEARCH_TOKENS);
}

function combineTokenClauses<T>(clauses: T[]): T | { AND: T[] } {
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

function productTokenWhere(token: string): Prisma.ProductWhereInput {
  return {
    OR: [
      {
        translations: {
          some: {
            title: { contains: token, mode: "insensitive" },
          },
        },
      },
      {
        translations: {
          some: {
            subtitle: { contains: token, mode: "insensitive" },
          },
        },
      },
      {
        variants: {
          some: {
            published: true,
            sku: { contains: token, mode: "insensitive" },
          },
        },
      },
    ],
  };
}

function listingRowTokenWhere(token: string): Prisma.ProductListingRowWhereInput {
  return {
    OR: [
      { searchText: { contains: token, mode: "insensitive" } },
      { title: { contains: token, mode: "insensitive" } },
      { slug: { contains: token, mode: "insensitive" } },
    ],
  };
}

/**
 * Search title, subtitle, and variant SKU (locale-agnostic contains).
 * Every query token must match (e.g. "samsung a26" finds "Samsung Galaxy A26").
 */
export function buildSearchWhere(search: string): Prisma.ProductWhereInput {
  return combineTokenClauses(tokenizeSearchQuery(search).map(productTokenWhere));
}

/**
 * Listing read-model search over searchText, title, and slug; every token must match.
 */
export function buildListingRowSearchWhere(
  search: string,
): Prisma.ProductListingRowWhereInput {
  return combineTokenClauses(tokenizeSearchQuery(search).map(listingRowTokenWhere));
}
