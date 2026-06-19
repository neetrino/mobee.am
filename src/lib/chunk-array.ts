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

/** Pads a chunk so every carousel page keeps a full grid (consistent column widths). */
export function padChunkToGroupSize<T>(chunk: readonly T[], groupSize: number): (T | undefined)[] {
  const out: (T | undefined)[] = [...chunk];
  while (out.length < groupSize) {
    out.push(undefined);
  }
  return out;
}
