/**
 * Shared layout for the two stacked top strips ({@link Header} + {@link MainHeaderBar})
 * so they use the same vertical padding and minimum height on large screens.
 */
export const HEADER_STRIP_PADDING_Y =
  'py-[0.45rem] sm:py-[0.6rem] lg:py-[0.6rem]';

/** Applied only where the full-width strip should match the other bar’s height (lg+). */
export const HEADER_STRIP_MIN_HEIGHT_LG = 'lg:min-h-[62px]';

export const HEADER_STRIP_INNER_ROW = `items-center ${HEADER_STRIP_PADDING_Y} ${HEADER_STRIP_MIN_HEIGHT_LG}`;
