import type { LanguageCode } from '../language';

/** Local WebP UI icons under `public/images/icons` — avoid expiring remote URLs. */
export const UI_ICONS_BASE = '/images/icons' as const;

export const LANGUAGE_FLAG_ICON_SRC: Record<LanguageCode, string> = {
  en: `${UI_ICONS_BASE}/language/en.webp`,
  hy: `${UI_ICONS_BASE}/language/hy.webp`,
  ru: `${UI_ICONS_BASE}/language/ru.webp`,
  ka: `${UI_ICONS_BASE}/language/ka.webp`,
};

export const CONTACT_ICON_PHONE_SRC = `${UI_ICONS_BASE}/contact/phone-call-icon.webp`;
export const CONTACT_ICON_EMAIL_SRC = `${UI_ICONS_BASE}/contact/email-envelope-icon.webp`;
export const CONTACT_ICON_LOCATION_SRC = `${UI_ICONS_BASE}/contact/location-pin-icon.webp`;

export const HEADER_PHONE_ICON_SRC = `${UI_ICONS_BASE}/header/phone-call-round.webp`;

export const DEFAULT_USER_AVATAR_SRC = '/images/default-profile-avatar.svg';

export const FOOTER_SOCIAL_FACEBOOK_ICON_SRC = `${UI_ICONS_BASE}/footer/social-facebook.webp`;

/** Figma mobee-new footer info (1:1477) — cyan circular social buttons. */
export const FOOTER_SOCIAL_BUTTON_SRC = {
  instagram: '/images/footer/social/instagram.svg',
  facebook: '/images/footer/social/facebook.svg',
  telegram: '/images/footer/social/telegram.svg',
  whatsapp: '/images/footer/social/whatsapp.svg',
  phoneGlyph: '/images/footer/social/phone-glyph.svg',
} as const;

export const WHY_CHOOSE_US_ICON_SRC = {
  warranty: `${UI_ICONS_BASE}/home/why-choose-us/warranty.webp`,
  delivery: `${UI_ICONS_BASE}/home/why-choose-us/delivery.webp`,
  installment: `${UI_ICONS_BASE}/home/why-choose-us/installment.webp`,
  original: `${UI_ICONS_BASE}/home/why-choose-us/original.webp`,
} as const;

export const PAYMENT_ICON_SRC = {
  arca: `${UI_ICONS_BASE}/payments/arca.webp`,
  aparik: `${UI_ICONS_BASE}/payments/aparik.webp`,
  cashOnDelivery: `${UI_ICONS_BASE}/payments/cash-on-delivery.webp`,
  idram: `${UI_ICONS_BASE}/payments/idram.webp`,
  mastercard: `${UI_ICONS_BASE}/payments/mastercard.webp`,
  visa: `${UI_ICONS_BASE}/payments/visa.webp`,
} as const;
