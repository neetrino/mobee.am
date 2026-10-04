import type { Attribute, AttributeValue } from './useAttributes';

export interface AttributeSearchResult {
  attribute: Attribute;
  /** True when name or key matched the query. */
  matchedByAttribute: boolean;
  /** Values that matched the query (empty when only attribute fields matched). */
  matchedValues: AttributeValue[];
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function valueMatchesQuery(value: AttributeValue, query: string): boolean {
  return (
    normalizeSearchText(value.label).includes(query) ||
    normalizeSearchText(value.value).includes(query)
  );
}

/**
 * Filters attributes by name, key, or value label/value.
 * Used by the admin attributes search box.
 */
export function filterAttributesBySearch(
  attributes: Attribute[],
  searchQuery: string,
): AttributeSearchResult[] {
  const query = normalizeSearchText(searchQuery);
  if (!query) {
    return attributes.map((attribute) => ({
      attribute,
      matchedByAttribute: false,
      matchedValues: [],
    }));
  }

  const results: AttributeSearchResult[] = [];

  for (const attribute of attributes) {
    const matchedByAttribute =
      normalizeSearchText(attribute.name).includes(query) ||
      normalizeSearchText(attribute.key).includes(query);

    const values = Array.isArray(attribute.values) ? attribute.values : [];
    const matchedValues = values.filter((value) => valueMatchesQuery(value, query));

    if (!matchedByAttribute && matchedValues.length === 0) {
      continue;
    }

    results.push({
      attribute,
      matchedByAttribute,
      matchedValues,
    });
  }

  return results;
}

/**
 * Values to show under an attribute while a search is active.
 * Attribute-level hits keep all values; value-only hits show matches.
 */
export function getVisibleValuesForSearch(
  attribute: Attribute,
  matchedByAttribute: boolean,
  matchedValues: AttributeValue[],
  hasActiveSearch: boolean,
): AttributeValue[] {
  const values = Array.isArray(attribute.values) ? attribute.values : [];
  if (!hasActiveSearch || matchedByAttribute) {
    return values;
  }
  return matchedValues;
}
