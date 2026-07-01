import { describe, expect, it } from 'vitest';
import { resolveProductCardNavigationColor } from './product-card-display-color';

describe('resolveProductCardNavigationColor', () => {
  it('prefers active shop filter color when it exists on the product', () => {
    expect(
      resolveProductCardNavigationColor(
        {
          image: 'https://cdn.example/black.png',
          displayColor: 'black',
          colors: [
            { value: 'Soft Pink', linkValue: 'soft pink' },
            { value: 'Black', linkValue: 'black' },
          ],
        },
        ['soft pink'],
      ),
    ).toBe('soft pink');
  });

  it('uses displayColor from listing when no filter is active', () => {
    expect(
      resolveProductCardNavigationColor(
        {
          image: 'https://cdn.example/black.png',
          displayColor: 'black',
          colors: [
            { value: 'Soft Pink', linkValue: 'soft pink' },
            { value: 'Black', linkValue: 'black' },
          ],
        },
        [],
      ),
    ).toBe('black');
  });

  it('falls back to image-matched color when displayColor is missing', () => {
    expect(
      resolveProductCardNavigationColor(
        {
          image: 'https://cdn.example/black.png',
          colors: [
            {
              value: 'Soft Pink',
              linkValue: 'soft pink',
              imageUrl: 'https://cdn.example/pink.png',
            },
            {
              value: 'Black',
              linkValue: 'black',
              imageUrl: 'https://cdn.example/black.png',
            },
          ],
        },
        [],
      ),
    ).toBe('black');
  });
});
