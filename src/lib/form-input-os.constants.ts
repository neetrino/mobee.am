/**
 * macOS ties spellcheck / input-source hints to the focused control’s `lang` vs page `html lang`.
 * Use on storefront data-entry forms so typing Latin in email/name fields does not pop the language switcher.
 */
export const FORM_INPUT_LATIN_LANG = 'en' as const;

/** Applied on shared {@link Input} by default; override per field when spellcheck is desired. */
export const FORM_INPUT_OS_AUTOCORRECT_ATTRS = {
  spellCheck: false,
  autoCorrect: 'off',
  autoCapitalize: 'off',
} as const;
