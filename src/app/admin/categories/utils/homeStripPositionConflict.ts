import { confirmDialog } from '../../../../components/ConfirmDialog';
import type { Category } from '../types';

export function findHomeStripPositionConflict(
  categories: Category[],
  position: number | null,
  excludeCategoryId?: string,
): Category | null {
  if (position === null) {
    return null;
  }

  return (
    categories.find(
      (category) =>
        category.homeStripPosition === position &&
        category.id !== excludeCategoryId,
    ) ?? null
  );
}

export async function confirmHomeStripPositionTakeover(
  t: (path: string) => string,
  position: number,
  occupiedByTitle: string,
): Promise<boolean> {
  return confirmDialog({
    message: t('admin.categories.homeStripPositionConflict')
      .replace('{position}', String(position))
      .replace('{name}', occupiedByTitle),
    confirmLabel: t('admin.categories.homeStripPositionConflictConfirm'),
    cancelLabel: t('admin.common.cancel'),
  });
}
