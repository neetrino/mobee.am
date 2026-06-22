import { describe, expect, it } from 'vitest';
import {
  attributeGroupRequiresSelection,
  getMissingRequiredAttributeKeys,
  isAllRequiredAttributesSelected,
  isAttributeSelected,
} from './required-attribute-selection';
import type { AttributeGroupValue } from '../types';

function group(values: Partial<AttributeGroupValue>[]): AttributeGroupValue[] {
  return values.map((value) => ({
    value: value.value ?? 'value',
    valueId: value.valueId,
    stock: value.stock ?? 1,
    variants: value.variants ?? [],
  }));
}

describe('required-attribute-selection', () => {
  it('requires selection only for multi-value in-stock groups', () => {
    expect(attributeGroupRequiresSelection('color', group([{ value: 'Black', stock: 1 }]))).toBe(false);
    expect(
      attributeGroupRequiresSelection('color', group([
        { value: 'Black', stock: 1 },
        { value: 'White', stock: 1 },
      ])),
    ).toBe(true);
    expect(attributeGroupRequiresSelection('storage', group([{ value: '256GB', stock: 0 }]))).toBe(false);
  });

  it('tracks missing color, size, and other attributes', () => {
    const attributeGroups = new Map<string, AttributeGroupValue[]>([
      ['color', group([{ value: 'Black' }, { value: 'White' }])],
      ['storage', group([{ value: '256GB' }, { value: '512GB' }])],
      ['sim', group([{ value: 'eSIM' }, { value: 'Dual SIM' }])],
    ]);

    const missing = getMissingRequiredAttributeKeys(attributeGroups, null, null, new Map());
    expect(missing).toEqual(['color', 'storage', 'sim']);

    const partial = getMissingRequiredAttributeKeys(
      attributeGroups,
      'Black',
      null,
      new Map([['storage', '256GB']]),
    );
    expect(partial).toEqual(['sim']);
  });

  it('reports complete selection when every required attribute is chosen', () => {
    const attributeGroups = new Map<string, AttributeGroupValue[]>([
      ['color', group([{ value: 'Black' }, { value: 'White' }])],
      ['storage', group([{ value: '256GB' }])],
    ]);

    expect(
      isAllRequiredAttributesSelected(
        attributeGroups,
        'Black',
        null,
        new Map(),
      ),
    ).toBe(true);

    expect(isAttributeSelected('color', 'Black', null, new Map())).toBe(true);
    expect(isAttributeSelected('storage', 'Black', null, new Map())).toBe(false);
  });
});
