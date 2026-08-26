const CATEGORY_ANCESTRY_WALK_GUARD = 64;

export type CategoryAncestry = {
  parentById: ReadonlyMap<string, string | null>;
  slugByIdLocale: ReadonlyMap<string, string>;
};

export function expandCategoryIdsWithAncestors(
  ids: Iterable<string>,
  parentById: ReadonlyMap<string, string | null>,
): string[] {
  const closure = new Set<string>();
  for (const id of ids) {
    let current: string | null | undefined = id;
    let guard = 0;
    while (current && !closure.has(current) && guard < CATEGORY_ANCESTRY_WALK_GUARD) {
      closure.add(current);
      current = parentById.get(current) ?? null;
      guard += 1;
    }
  }
  return [...closure];
}

export function collectCategorySlugsForLocale(
  categoryIds: readonly string[],
  locale: string,
  slugByIdLocale: ReadonlyMap<string, string>,
): string[] {
  const slugs: string[] = [];
  for (const categoryId of categoryIds) {
    const slug = slugByIdLocale.get(`${categoryId}:${locale}`);
    if (slug) slugs.push(slug);
  }
  return [...new Set(slugs)];
}
