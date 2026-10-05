/**
 * Prefer a capitalized label when the same facet value appears with different casing.
 */
export function preferredLabel(current: string, incoming: string): string {
  if (!current) return incoming;
  const currentUpper = current[0] === current[0]?.toUpperCase();
  const incomingUpper = incoming[0] === incoming[0]?.toUpperCase();
  if (incomingUpper && !currentUpper) return incoming;
  return current;
}
