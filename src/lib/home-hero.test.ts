import { describe, expect, it } from 'vitest';
import {
  convertStaticHeroBannerSlides,
  createEmptyHomeHeroSlide,
  DEFAULT_HOME_HERO_SETTINGS,
  getInitialHomeHeroSlides,
  isValidHomeHeroHref,
  normalizeHomeHeroHref,
  normalizeHomeHeroSettings,
  reorderHomeHeroSlides,
  resolveHomeHeroSettingsForRead,
  toHeroCarouselSlides,
  validateHomeHeroSettingsInput,
} from './home-hero';

describe('normalizeHomeHeroSettings', () => {
  it('returns empty slides for null', () => {
    expect(normalizeHomeHeroSettings(null)).toEqual(DEFAULT_HOME_HERO_SETTINGS);
  });

  it('returns empty slides for non-object input', () => {
    expect(normalizeHomeHeroSettings('oops')).toEqual({ slides: [] });
    expect(normalizeHomeHeroSettings([])).toEqual({ slides: [] });
  });

  it('returns empty slides when slides is missing or not an array', () => {
    expect(normalizeHomeHeroSettings({})).toEqual({ slides: [] });
    expect(normalizeHomeHeroSettings({ slides: null })).toEqual({ slides: [] });
  });

  it('trims valid slide fields and preserves order', () => {
    expect(
      normalizeHomeHeroSettings({
        slides: [
          {
            id: ' a ',
            desktopImage: { url: ' https://cdn.example.com/a.webp ' },
            mobileImage: null,
            href: ' /shop ',
          },
          {
            id: 'b',
            desktopImage: null,
            mobileImage: { url: 'https://cdn.example.com/b.webp' },
            href: null,
          },
        ],
      }),
    ).toEqual({
      slides: [
        {
          id: 'a',
          desktopImage: { url: 'https://cdn.example.com/a.webp' },
          mobileImage: null,
          href: '/shop',
        },
        {
          id: 'b',
          desktopImage: null,
          mobileImage: { url: 'https://cdn.example.com/b.webp' },
          href: null,
        },
      ],
    });
  });

  it('turns empty strings into null media/href', () => {
    const result = normalizeHomeHeroSettings({
      slides: [
        {
          id: 'x',
          desktopImage: { url: '   ' },
          mobileImage: { url: '' },
          href: '   ',
        },
      ],
    });
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0]?.desktopImage).toBeNull();
    expect(result.slides[0]?.mobileImage).toBeNull();
    expect(result.slides[0]?.href).toBeNull();
  });

  it('nulls malformed image objects', () => {
    const result = normalizeHomeHeroSettings({
      slides: [
        {
          id: 'x',
          desktopImage: { src: 'https://cdn.example.com/x.webp' },
          mobileImage: 'https://cdn.example.com/m.webp',
          href: '/shop',
        },
      ],
    });
    expect(result.slides[0]?.desktopImage).toBeNull();
    expect(result.slides[0]?.mobileImage).toBeNull();
    expect(result.slides[0]?.href).toBe('/shop');
  });

  it('generates ids for missing slide ids and dedupes duplicates', () => {
    const result = normalizeHomeHeroSettings({
      slides: [
        { desktopImage: { url: '/a.webp' }, mobileImage: null, href: null },
        { id: 'same', desktopImage: { url: '/b.webp' }, mobileImage: null, href: null },
        { id: 'same', desktopImage: { url: '/c.webp' }, mobileImage: null, href: null },
      ],
    });
    expect(result.slides).toHaveLength(3);
    expect(result.slides[0]?.id.length).toBeGreaterThan(0);
    expect(result.slides[1]?.id).toBe('same');
    expect(result.slides[2]?.id).not.toBe('same');
    expect(new Set(result.slides.map((s) => s.id)).size).toBe(3);
  });

  it('migrates legacy single-banner shape into one slide', () => {
    expect(
      normalizeHomeHeroSettings({
        desktopImage: { url: '/old.webp' },
        mobileImage: null,
        href: '/shop',
      }),
    ).toEqual({
      slides: [
        {
          id: 'legacy-home-hero',
          desktopImage: { url: '/old.webp' },
          mobileImage: null,
          href: '/shop',
        },
      ],
    });
  });
});

describe('static conversion / initial defaults', () => {
  it('converts static banner slides without text fields', () => {
    const converted = convertStaticHeroBannerSlides([
      { id: 'iphone', imageSrc: '/iphone.webp' },
    ]);
    expect(converted).toEqual([
      {
        id: 'iphone',
        desktopImage: { url: '/iphone.webp' },
        mobileImage: null,
        href: null,
      },
    ]);
  });

  it('returns empty slides when Settings are empty (promo fallback on public page)', () => {
    expect(resolveHomeHeroSettingsForRead(null)).toEqual({ slides: [] });
    expect(getInitialHomeHeroSlides()).toEqual([]);
  });

  it('does not replace saved multi-slide settings with empty defaults', () => {
    const resolved = resolveHomeHeroSettingsForRead({
      slides: [
        {
          id: 'custom',
          desktopImage: { url: '/custom.webp' },
          mobileImage: null,
          href: null,
        },
      ],
    });
    expect(resolved.slides).toHaveLength(1);
    expect(resolved.slides[0]?.id).toBe('custom');
  });
});

describe('isValidHomeHeroHref / normalizeHomeHeroHref', () => {
  it.each(['/shop', '/products/test', 'https://example.com', 'http://example.com'])(
    'accepts %s',
    (href) => {
      expect(isValidHomeHeroHref(href)).toBe(true);
      expect(normalizeHomeHeroHref(href)).toBe(href);
    },
  );

  it('accepts null and empty as null', () => {
    expect(normalizeHomeHeroHref(null)).toBeNull();
    expect(normalizeHomeHeroHref('')).toBeNull();
    expect(normalizeHomeHeroHref('   ')).toBeNull();
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'ftp://example.com',
    'shop',
    'example.com',
  ])('rejects %s', (href) => {
    expect(isValidHomeHeroHref(href)).toBe(false);
    expect(normalizeHomeHeroHref(href)).toBeNull();
  });
});

describe('validateHomeHeroSettingsInput', () => {
  it('accepts multi-slide payload and strips empty slides', () => {
    const result = validateHomeHeroSettingsInput({
      slides: [
        {
          id: 'keep',
          desktopImage: { url: 'https://cdn.example.com/d.webp' },
          mobileImage: null,
          href: '/shop',
        },
        {
          id: 'empty',
          desktopImage: null,
          mobileImage: null,
          href: null,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slides).toHaveLength(1);
      expect(result.data.slides[0]?.id).toBe('keep');
    }
  });

  it('rejects duplicate slide ids', () => {
    const result = validateHomeHeroSettingsInput({
      slides: [
        { id: 'dup', desktopImage: { url: '/a.webp' }, mobileImage: null, href: null },
        { id: 'dup', desktopImage: { url: '/b.webp' }, mobileImage: null, href: null },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsafe href on save', () => {
    const result = validateHomeHeroSettingsInput({
      slides: [
        {
          id: 'x',
          desktopImage: { url: '/a.webp' },
          mobileImage: null,
          href: 'javascript:alert(1)',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('allows empty slides array', () => {
    const result = validateHomeHeroSettingsInput({ slides: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slides).toEqual([]);
    }
  });
});

describe('toHeroCarouselSlides / homepage presentation', () => {
  it('maps saved slides for carousel rendering', () => {
    const slides = toHeroCarouselSlides({
      slides: [
        {
          id: 'a',
          desktopImage: { url: '/d.webp' },
          mobileImage: { url: '/m.webp' },
          href: '/shop',
        },
      ],
    });
    expect(slides).toEqual([
      {
        id: 'a',
        desktopImageUrl: '/d.webp',
        mobileImageUrl: '/m.webp',
        href: '/shop',
      },
    ]);
  });

  it('uses desktop as mobile fallback and skips imageless slides', () => {
    const slides = toHeroCarouselSlides({
      slides: [
        {
          id: 'ok',
          desktopImage: { url: '/d.webp' },
          mobileImage: null,
          href: null,
        },
        {
          id: 'skip',
          desktopImage: null,
          mobileImage: null,
          href: '/shop',
        },
      ],
    });
    expect(slides).toEqual([
      {
        id: 'ok',
        desktopImageUrl: '/d.webp',
        mobileImageUrl: '/d.webp',
        href: null,
      },
    ]);
  });

  it('no DB slides → empty carousel list (public promo fallback)', () => {
    const settings = resolveHomeHeroSettingsForRead(null);
    expect(toHeroCarouselSlides(settings)).toEqual([]);
  });
});

describe('createEmptyHomeHeroSlide', () => {
  it('creates unique empty slides', () => {
    const a = createEmptyHomeHeroSlide();
    const b = createEmptyHomeHeroSlide();
    expect(a.id).not.toBe(b.id);
    expect(a.desktopImage).toBeNull();
    expect(a.mobileImage).toBeNull();
    expect(a.href).toBeNull();
  });
});

describe('reorderHomeHeroSlides', () => {
  const sample = [
    {
      id: 'a',
      desktopImage: { url: '/a.webp' },
      mobileImage: null,
      href: null,
    },
    {
      id: 'b',
      desktopImage: { url: '/b.webp' },
      mobileImage: null,
      href: null,
    },
    {
      id: 'c',
      desktopImage: { url: '/c.webp' },
      mobileImage: null,
      href: null,
    },
  ];

  it('moves a slide below another', () => {
    expect(reorderHomeHeroSlides(sample, 'a', 'c').map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves a slide above another', () => {
    expect(reorderHomeHeroSlides(sample, 'c', 'a').map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns the same array when ids match or are unknown', () => {
    expect(reorderHomeHeroSlides(sample, 'a', 'a')).toBe(sample);
    expect(reorderHomeHeroSlides(sample, 'missing', 'a')).toBe(sample);
  });
});
