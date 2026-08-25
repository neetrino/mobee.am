import { CATALOG_EMPTY_TOKENS } from "./catalog.constants";

const EMPTY_TOKEN_SET = new Set<string>(CATALOG_EMPTY_TOKENS);

function isKeptToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return !EMPTY_TOKEN_SET.has(trimmed.toLowerCase());
}

/**
 * Split a comma-separated filter value: trim, drop empty/null tokens, dedupe.
 */
export function normalizeFilterTokens(
  value: string | undefined,
  transform?: (token: string) => string,
  maxTokens?: number,
): string[] {
  if (!value || typeof value !== "string") {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of value.split(",")) {
    if (!isKeptToken(part)) {
      continue;
    }
    const trimmed = part.trim();
    const mapped = transform ? transform(trimmed) : trimmed;
    if (!mapped || EMPTY_TOKEN_SET.has(mapped.toLowerCase())) {
      continue;
    }
    const dedupeKey = mapped.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    result.push(mapped);
    if (maxTokens !== undefined && result.length >= maxTokens) {
      break;
    }
  }

  return result;
}

/** Stable comma list for cache keys (`apple,samsung` === `samsung,apple`). */
export function canonicalizeTokenList(tokens: string[]): string {
  return [...tokens].sort((a, b) => a.localeCompare(b)).join(",");
}
