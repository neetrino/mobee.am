/**
 * Public message from search API JSON (problem+json `detail`, or legacy fields).
 */
export function instantSearchErrorMessage(
  data: unknown,
  status: number,
): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["detail", "error", "details"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }
  return `Search failed: ${status}`;
}
