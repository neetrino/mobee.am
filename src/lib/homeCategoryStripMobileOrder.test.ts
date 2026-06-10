import { describe, expect, it } from 'vitest';
import { reorderHomeStripItemsForMobile } from './homeCategoryStripMobileOrder';

type StripItem = {
  id: string;
  slug: string;
  title: string;
  fullPath: string;
  position: number;
  children: [];
};

function makeItem(id: string, title: string, position: number): StripItem {
  return {
    id,
    slug: '',
    title,
    fullPath: '',
    position,
    children: [],
  };
}

describe('reorderHomeStripItemsForMobile', () => {
  it('swaps household appliances and tablets on mobile strip', () => {
    const items = [
      makeItem('tv', 'Հեռուստացույց', 0),
      makeItem('household', 'Կենցաղային տեխնիկա', 1),
      makeItem('tablets', 'Պլանշետ', 2),
      makeItem('computers', 'Համակարգիչ', 3),
    ];

    const result = reorderHomeStripItemsForMobile(items);

    expect(result.map((item) => item.title)).toEqual([
      'Հեռուստացույց',
      'Պլանշետ',
      'Կենցաղային տեխնիկա',
      'Համակարգիչ',
    ]);
  });

  it('keeps order unchanged when one category is missing', () => {
    const items = [makeItem('household', 'Կենցաղային տեխնիկա', 0)];

    expect(reorderHomeStripItemsForMobile(items)).toEqual(items);
  });
});
