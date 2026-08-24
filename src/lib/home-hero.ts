/**
 * Homepage hero settings stored in `Settings` key `home-hero`.
 * Multi-slide carousel: desktop/mobile images + optional CTA href per slide.
 */

import { nanoid } from 'nanoid';
import {
  HERO_BANNER_SLIDES,
  type HeroBannerSlide,
} from '@/components/hero-banner-slides.constants';

export const HOME_HERO_SETTING_KEY = 'home-hero';

export const MAX_HOME_HERO_SLIDES = 20;

export type HomeHeroMedia = {
  url: string;
};

export type HomeHeroSlide = {
  id: string;
  desktopImage: HomeHeroMedia | null;
  mobileImage: HomeHeroMedia | null;
  href: string | null;
};

export type HomeHeroSettings = {
  slides: HomeHeroSlide[];
};

export const DEFAULT_HOME_HERO_SETTINGS: HomeHeroSettings = {
  slides: [],
};

/** Legacy static banner shape (optional seed input for conversion helpers/tests). */
export type StaticHeroBannerSlide = {
  id: string;
  imageSrc: string;
};

/** Public carousel slide after resolving display URLs. */
export type HeroCarouselSlide = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  href: string | null;
};

export function createEmptyHomeHeroSlide(): HomeHeroSlide {
  return {
    id: nanoid(),
    desktopImage: null,
    mobileImage: null,
    href: null,
  };
}

export function isHomeHeroSlideEmpty(slide: HomeHeroSlide): boolean {
  return slide.desktopImage === null && slide.mobileImage === null && slide.href === null;
}

export function stripEmptyHomeHeroSlides(slides: HomeHeroSlide[]): HomeHeroSlide[] {
  return slides.filter((slide) => !isHomeHeroSlideEmpty(slide));
}

/**
 * Reorder slides by active/over ids (drag-and-drop). Returns the same array reference when unchanged.
 */
export function reorderHomeHeroSlides(
  slides: HomeHeroSlide[],
  activeId: string,
  overId: string,
): HomeHeroSlide[] {
  if (activeId === overId) {
    return slides;
  }

  const oldIndex = slides.findIndex((slide) => slide.id === activeId);
  const newIndex = slides.findIndex((slide) => slide.id === overId);
  if (oldIndex < 0 || newIndex < 0) {
    return slides;
  }

  const next = [...slides];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return next;
}

/**
 * Convert legacy static banner entries into admin-compatible slides.
 */
export function convertStaticHeroBannerSlides(
  slides: readonly StaticHeroBannerSlide[] | readonly HeroBannerSlide[] = HERO_BANNER_SLIDES,
): HomeHeroSlide[] {
  return slides.map((slide) => ({
    id: slide.id,
    desktopImage: { url: slide.imageSrc },
    mobileImage: null,
    href: null,
  }));
}

/**
 * Initial slides when Settings are missing or empty (no DB write).
 */
export function getInitialHomeHeroSlides(): HomeHeroSlide[] {
  return convertStaticHeroBannerSlides(HERO_BANNER_SLIDES);
}

function normalizeMedia(value: unknown): HomeHeroMedia | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const urlValue = (value as { url?: unknown }).url;
  if (typeof urlValue !== 'string') {
    return null;
  }

  const url = urlValue.trim();
  if (!url) {
    return null;
  }

  return { url };
}

/**
 * Returns a safe href for storage/rendering, or null when empty/invalid.
 */
export function normalizeHomeHeroHref(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidHomeHeroHref(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Accepts internal paths (`/…`) and absolute http(s) URLs only.
 */
export function isValidHomeHeroHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return true;
  }

  if (href.startsWith('https://') || href.startsWith('http://')) {
    return true;
  }

  return false;
}

export type HomeHeroNavigationTarget =
  | { mode: 'internal'; href: string }
  | { mode: 'external'; href: string };

const KNOWN_SITE_HOSTS = new Set(['mobee.am', 'www.mobee.am']);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function collectAppHostnames(currentOrigin?: string): Set<string> {
  const hosts = new Set<string>();

  for (const host of KNOWN_SITE_HOSTS) {
    hosts.add(normalizeHostname(host));
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (envUrl) {
    try {
      hosts.add(normalizeHostname(new URL(envUrl).hostname));
    } catch {
      // ignore invalid env URL
    }
  }

  if (currentOrigin) {
    try {
      hosts.add(normalizeHostname(new URL(currentOrigin).hostname));
    } catch {
      // ignore invalid origin
    }
  }

  return hosts;
}

/**
 * Resolve CTA href for click navigation.
 * Same-site absolute URLs become internal paths so Next.js Link stays in-app.
 */
export function resolveHomeHeroNavigationTarget(
  href: string,
  options?: { currentOrigin?: string },
): HomeHeroNavigationTarget | null {
  const trimmed = href.trim();
  if (!trimmed || !isValidHomeHeroHref(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { mode: 'internal', href: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const appHosts = collectAppHostnames(options?.currentOrigin);
  if (appHosts.has(normalizeHostname(url.hostname))) {
    const path = `${url.pathname}${url.search}${url.hash}` || '/';
    return { mode: 'internal', href: path };
  }

  return { mode: 'external', href: trimmed };
}

function allocateUniqueSlideId(preferred: string | null, usedIds: Set<string>): string {
  const base = preferred && preferred.trim() ? preferred.trim() : nanoid();
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  let next = `${base}-${nanoid(6)}`;
  while (usedIds.has(next)) {
    next = `${base}-${nanoid(6)}`;
  }
  usedIds.add(next);
  return next;
}

function normalizeSlide(value: unknown, usedIds: Set<string>): HomeHeroSlide | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredId = typeof record.id === 'string' ? record.id : null;

  return {
    id: allocateUniqueSlideId(preferredId, usedIds),
    desktopImage: normalizeMedia(record.desktopImage),
    mobileImage: normalizeMedia(record.mobileImage),
    href: normalizeHomeHeroHref(record.href),
  };
}

function isLegacySingleBannerShape(record: Record<string, unknown>): boolean {
  return (
    !('slides' in record) &&
    ('desktopImage' in record || 'mobileImage' in record || 'href' in record)
  );
}

/**
 * Normalize unknown DB/API JSON into {@link HomeHeroSettings}.
 * Supports legacy single-banner shape. Empty slides stay empty (caller may apply static defaults).
 */
export function normalizeHomeHeroSettings(value: unknown): HomeHeroSettings {
  if (value === null || value === undefined) {
    return { slides: [] };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { slides: [] };
  }

  const record = value as Record<string, unknown>;
  const usedIds = new Set<string>();

  if (isLegacySingleBannerShape(record)) {
    const slide = normalizeSlide(
      {
        id: 'legacy-home-hero',
        desktopImage: record.desktopImage,
        mobileImage: record.mobileImage,
        href: record.href,
      },
      usedIds,
    );

    if (!slide || isHomeHeroSlideEmpty(slide)) {
      return { slides: [] };
    }

    return { slides: [slide] };
  }

  if (!Array.isArray(record.slides)) {
    return { slides: [] };
  }

  const slides: HomeHeroSlide[] = [];
  for (const item of record.slides) {
    const slide = normalizeSlide(item, usedIds);
    if (slide) {
      slides.push(slide);
    }
  }

  return { slides };
}

/**
 * Settings for admin/public reads: DB slides, or converted static banners when empty.
 * Never writes to the database.
 */
export function resolveHomeHeroSettingsForRead(value: unknown): HomeHeroSettings {
  const normalized = normalizeHomeHeroSettings(value);
  if (normalized.slides.length === 0) {
    return { slides: getInitialHomeHeroSlides() };
  }
  return normalized;
}

/**
 * Map settings slides to carousel-ready slides (skip entries with no images).
 */
export function toHeroCarouselSlides(settings: HomeHeroSettings): HeroCarouselSlide[] {
  const result: HeroCarouselSlide[] = [];

  for (const slide of settings.slides) {
    const desktopSrc = slide.desktopImage?.url ?? slide.mobileImage?.url ?? null;
    const mobileSrc = slide.mobileImage?.url ?? slide.desktopImage?.url ?? null;
    if (!desktopSrc || !mobileSrc) {
      continue;
    }

    result.push({
      id: slide.id,
      desktopImageUrl: desktopSrc,
      mobileImageUrl: mobileSrc,
      href: slide.href,
    });
  }

  return result;
}

export type HomeHeroValidationResult =
  | { success: true; data: HomeHeroSettings }
  | { success: false; detail: string };

function validateMediaField(
  value: unknown,
  fieldName: string,
): { ok: true; media: HomeHeroMedia | null } | { ok: false; detail: string } {
  if (value === null || value === undefined) {
    return { ok: true, media: null };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      detail: `${fieldName} must be null or an object with a non-empty url string`,
    };
  }

  const urlValue = (value as { url?: unknown }).url;
  if (typeof urlValue !== 'string') {
    return {
      ok: false,
      detail: `${fieldName}.url must be a non-empty string`,
    };
  }

  const url = urlValue.trim();
  if (!url) {
    return {
      ok: false,
      detail: `${fieldName}.url must be a non-empty string`,
    };
  }

  return { ok: true, media: { url } };
}

/**
 * Validate admin PUT body. Strips completely empty slides before persistence.
 */
export function validateHomeHeroSettingsInput(value: unknown): HomeHeroValidationResult {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return {
      success: false,
      detail: 'Body must be an object with a slides array',
    };
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.slides)) {
    return {
      success: false,
      detail: 'slides must be an array',
    };
  }

  if (record.slides.length > MAX_HOME_HERO_SLIDES) {
    return {
      success: false,
      detail: `slides must contain at most ${MAX_HOME_HERO_SLIDES} items`,
    };
  }

  const usedIds = new Set<string>();
  const slides: HomeHeroSlide[] = [];

  for (let index = 0; index < record.slides.length; index += 1) {
    const item = record.slides[index];
    if (item === null || item === undefined || typeof item !== 'object' || Array.isArray(item)) {
      return {
        success: false,
        detail: `slides[${index}] must be an object`,
      };
    }

    const slideRecord = item as Record<string, unknown>;
    const rawId = typeof slideRecord.id === 'string' ? slideRecord.id.trim() : '';
    if (!rawId) {
      return {
        success: false,
        detail: `slides[${index}].id must be a non-empty string`,
      };
    }

    if (usedIds.has(rawId)) {
      return {
        success: false,
        detail: `Duplicate slide id: ${rawId}`,
      };
    }
    usedIds.add(rawId);

    const desktop = validateMediaField(slideRecord.desktopImage, `slides[${index}].desktopImage`);
    if (!desktop.ok) {
      return { success: false, detail: desktop.detail };
    }

    const mobile = validateMediaField(slideRecord.mobileImage, `slides[${index}].mobileImage`);
    if (!mobile.ok) {
      return { success: false, detail: mobile.detail };
    }

    if (
      slideRecord.href !== null &&
      slideRecord.href !== undefined &&
      typeof slideRecord.href !== 'string'
    ) {
      return {
        success: false,
        detail: `slides[${index}].href must be a string, empty string, or null`,
      };
    }

    const hrefRaw = typeof slideRecord.href === 'string' ? slideRecord.href.trim() : '';
    if (hrefRaw && !isValidHomeHeroHref(hrefRaw)) {
      return {
        success: false,
        detail: `slides[${index}].href must be an internal path starting with / or an absolute http:// or https:// URL`,
      };
    }

    slides.push({
      id: rawId,
      desktopImage: desktop.media,
      mobileImage: mobile.media,
      href: hrefRaw || null,
    });
  }

  return {
    success: true,
    data: {
      slides: stripEmptyHomeHeroSlides(slides),
    },
  };
}
