'use client';

import type { CategoryWithLevel } from '../types';
import { CategoryTableRowCells } from './CategoryTableRowCells';

interface CategoryItemProps {
  category: CategoryWithLevel;
  subcategoryLabel: string;
  reorderEnabled: boolean;
  isDragging: boolean;
  placeholderHeight: number;
  togglingHomePageId?: string | null;
  onEdit: (category: CategoryWithLevel) => void;
  onDelete: (categoryId: string, categoryTitle: string) => void;
  onToggleHomePage: (categoryId: string) => void;
  onHandlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function CategoryItem({
  category,
  subcategoryLabel,
  reorderEnabled,
  isDragging,
  placeholderHeight,
  togglingHomePageId,
  onEdit,
  onDelete,
  onToggleHomePage,
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
        togglingHomePage={togglingHomePageId === category.id}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleHomePage={onToggleHomePage}
        onHandlePointerDown={onHandlePointerDown}
      />
    </tr>
  );
}
