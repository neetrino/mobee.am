/**
 * Ադմին պանելում բոլոր ապրանքների շարքում ցուցադրվող միասնական նկարի ուղի (fallback)։
 */
export const ADMIN_UNIFORM_PRODUCT_THUMBNAIL_SRC = '/images/admin/uniform-product-thumbnail.png';

/** Returns product image when available, otherwise the admin fallback thumbnail. */
export function resolveAdminProductThumbnailSrc(
  image: string | null | undefined,
): string {
  if (typeof image === 'string' && image.trim().length > 0) {
    return image.trim();
  }
  return ADMIN_UNIFORM_PRODUCT_THUMBNAIL_SRC;
}
