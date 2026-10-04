import { describe, expect, it } from 'vitest';
import type { Attribute } from './useAttributes';
import {
  filterAttributesBySearch,
  getVisibleValuesForSearch,
} from './filterAttributesBySearch';

function buildAttribute(overrides: Partial<Attribute> = {}): Attribute {
  return {
    id: 'attr-1',
    key: 'color',
    name: 'Color',
    type: 'select',
    filterable: true,
    values: [
      { id: 'v1', value: 'red', label: 'Red' },
      { id: 'v2', value: 'blue', label: 'Blue' },
    ],
    ...overrides,
  };
}

describe('filterAttributesBySearch', () => {
  it('returns all attributes when query is empty', () => {
    const attributes = [buildAttribute()];
    const results = filterAttributesBySearch(attributes, '   ');
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedByAttribute).toBe(false);
    expect(results[0]?.matchedValues).toEqual([]);
  });

  it('matches by attribute name and key', () => {
    const attributes = [buildAttribute(), buildAttribute({ id: 'attr-2', key: 'size', name: 'Size', values: [] })];
    expect(filterAttributesBySearch(attributes, 'col')).toHaveLength(1);
    expect(filterAttributesBySearch(attributes, 'SIZE')[0]?.attribute.key).toBe('size');
  });

  it('matches by value label and expands searchable values', () => {
    const attributes = [buildAttribute()];
    const results = filterAttributesBySearch(attributes, 'blu');
    expect(results).toHaveLength(1);
    expect(results[0]?.matchedByAttribute).toBe(false);
    expect(results[0]?.matchedValues.map((value) => value.id)).toEqual(['v2']);
  });

  it('is null-safe for missing values and labels', () => {
    const attributes = [
      buildAttribute({
        name: undefined as unknown as string,
        values: [{ id: 'v3', value: 'green', label: undefined as unknown as string }],
      }),
    ];
    expect(() => filterAttributesBySearch(attributes, 'green')).not.toThrow();
    expect(filterAttributesBySearch(attributes, 'green')).toHaveLength(1);
  });
});

describe('getVisibleValuesForSearch', () => {
  it('shows only matched values for value-only hits', () => {
    const attribute = buildAttribute();
    const matched = attribute.values.filter((value) => value.id === 'v1');
    const visible = getVisibleValuesForSearch(attribute, false, matched, true);
    expect(visible.map((value) => value.id)).toEqual(['v1']);
  });

  it('shows all values when attribute itself matched', () => {
    const attribute = buildAttribute();
    const visible = getVisibleValuesForSearch(attribute, true, [], true);
    expect(visible).toHaveLength(2);
  });
});
