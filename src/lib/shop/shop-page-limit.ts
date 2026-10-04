import {
  CATALOG_MAX_PAGE_SIZE,
  SHOP_DESKTOP_GRID_COLUMNS,
  SHOP_MIN_PRODUCT_ROWS,
  SHOP_PAGE_DEFAULT_LIMIT,
  SHOP_PRODUCT_ROW_HEIGHT_PX,
} from '@/lib/catalog/catalog.constants';

/**
 * How many products one desktop shop page should show to fill `filterHeightPx`.
 */
export function computeShopPageLimitFromFilterHeight(
  filterHeightPx: number,
  rowHeightPx: number = SHOP_PRODUCT_ROW_HEIGHT_PX,
  columns: number = SHOP_DESKTOP_GRID_COLUMNS,
): number {
  if (filterHeightPx <= 0 || rowHeightPx <= 0 || columns <= 0) {
    return SHOP_PAGE_DEFAULT_LIMIT;
  }

  const rows = Math.max(
    SHOP_MIN_PRODUCT_ROWS,
    Math.ceil(filterHeightPx / rowHeightPx),
  );
  return Math.min(rows * columns, CATALOG_MAX_PAGE_SIZE);
}
