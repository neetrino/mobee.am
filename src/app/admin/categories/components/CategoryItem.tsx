'use client';

import type { CategoryWithLevel } from '../types';
import { CategoryTableRowCells } from './CategoryTableRowCells';

interface CategoryItemProps {
  category: CategoryWithLevel;
  subcategoryLabel: string;
  reorderEnabled: boolean;
  isDragging: boolean;
  placeholderHeight: number;
  onEdit: (category: CategoryWithLevel) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
  onHandlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function CategoryItem({
  category,
  subcategoryLabel,
  reorderEnabled,
  isDragging,
  placeholderHeight,
  onEdit,
  onDelete,
  onHandlePointerDown,
}: CategoryItemProps) {
  if (isDragging) {
    return (
      <tr
        data-category-placeholder={category.id}
        aria-hidden="true"
        className="border-b border-dashed border-orange-200 bg-orange-50/40"
      >
        <td colSpan={5} className="p-0">
          <div style={{ height: placeholderHeight }} />
        </td>
      </tr>
    );
  }

  return (
    <tr
      data-category-id={category.id}
      className="border-b border-gray-200 bg-white hover:bg-gray-50"
    >
      <CategoryTableRowCells
        category={category}
        subcategoryLabel={subcategoryLabel}
        reorderEnabled={reorderEnabled}
        isHandleActive={false}
        onEdit={onEdit}
        onDelete={onDelete}
        onHandlePointerDown={onHandlePointerDown}
      />
    </tr>
  );
}
