type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extract URL string from product media JSON item. */
export function extractMediaUrl(item: unknown): string | null {
  if (!item) return null;
  if (typeof item === "string") return item.trim() || null;
  if (isRecord(item) && typeof item.url === "string") return item.url.trim() || null;
  return null;
}

/** Convert a public R2 URL to an object key, or null when not hosted on R2. */
export function urlToR2Key(url: string, publicUrlBase: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const base = publicUrlBase.replace(/\/$/, "");
  if (trimmed.startsWith(`${base}/`)) {
    return trimmed.slice(base.length + 1);
  }

  try {
    const parsed = new URL(trimmed);
    const baseParsed = new URL(base);
    if (parsed.origin === baseParsed.origin) {
      return parsed.pathname.replace(/^\/+/, "");
    }
  } catch {
    return null;
  }

  return null;
}

/** Collect R2 keys from a list of media JSON entries. */
export function collectR2KeysFromMedia(
  media: unknown,
  publicUrlBase: string,
): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(media)) return keys;

  for (const item of media) {
    const url = extractMediaUrl(item);
    if (!url) continue;
    const key = urlToR2Key(url, publicUrlBase);
    if (key) keys.add(key);
  }

  return keys;
}

export function collectR2KeysFromUrl(
  url: string | null | undefined,
  publicUrlBase: string,
): Set<string> {
  const keys = new Set<string>();
  if (!url) return keys;
  const key = urlToR2Key(url, publicUrlBase);
  if (key) keys.add(key);
  return keys;
}

/** Walk arbitrary JSON and collect R2 keys referenced by URL strings. */
export function collectR2KeysFromJsonValue(
  value: unknown,
  publicUrlBase: string,
  output: Set<string>,
): void {
  if (typeof value === "string") {
    const key = urlToR2Key(value, publicUrlBase);
    if (key) output.add(key);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectR2KeysFromJsonValue(item, publicUrlBase, output);
    }
    return;
  }

  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      collectR2KeysFromJsonValue(nested, publicUrlBase, output);
    }
  }
}

/** Keys that should never be deleted even if orphaned. */
export function isProtectedR2Key(key: string): boolean {
  if (!key.startsWith("products/")) return true;
  if (key.includes("/placeholder/")) return true;
  if (key.includes("/default/")) return true;
  return false;
}
