export const HOME_CATEGORY_STRIP_DESKTOP_COLUMNS = 6;
/** @deprecated Legacy slot cap; home strip no longer limits starred categories. */
export const HOME_CATEGORY_STRIP_MAX_POSITION = HOME_CATEGORY_STRIP_DESKTOP_COLUMNS;
export const HOME_CATEGORY_STRIP_LIMIT = HOME_CATEGORY_STRIP_DESKTOP_COLUMNS;

export const HOME_CATEGORY_STRIP_MIN_POSITION = 1;

export const HOME_CATEGORY_STRIP_POSITIONS = [
  HOME_CATEGORY_STRIP_MIN_POSITION,
  HOME_CATEGORY_STRIP_MIN_POSITION + 1,
  HOME_CATEGORY_STRIP_MIN_POSITION + 2,
  HOME_CATEGORY_STRIP_MIN_POSITION + 3,
  HOME_CATEGORY_STRIP_MIN_POSITION + 4,
  HOME_CATEGORY_STRIP_MAX_POSITION,
] as const;

export type HomeCategoryStripPosition = (typeof HOME_CATEGORY_STRIP_POSITIONS)[number];

export function isValidHomeStripPosition(value: unknown): value is HomeCategoryStripPosition {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return (
    Number.isInteger(parsed) &&
    parsed >= HOME_CATEGORY_STRIP_MIN_POSITION &&
    parsed <= HOME_CATEGORY_STRIP_MAX_POSITION
  );
}

export function normalizeHomeStripPosition(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (!isValidHomeStripPosition(value)) {
    return null;
  }
  return value as number;
}
