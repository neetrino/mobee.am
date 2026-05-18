/**
 * iOS Safari zooms the viewport when a focused text control’s computed `font-size` is below **16px**.
 * Use on mobile-visible `<input>` / `<textarea>` (e.g. header search) instead of `text-sm` / `text-[13px]`.
 */
export const MOBILE_IOS_NO_FOCUS_ZOOM_INPUT_TEXT_CLASS =
  'text-base leading-normal' as const;
