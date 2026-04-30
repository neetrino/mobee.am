/**
 * Splits a list into consecutive groups of at most `groupSize` items.
 */
export function chunkArray<T>(items: readonly T[], groupSize: number): T[][] {
  if (groupSize < 1) {
    return [];
  }
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += groupSize) {
    groups.push(items.slice(start, start + groupSize));
  }
  return groups;
}
