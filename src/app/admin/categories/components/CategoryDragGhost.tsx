'use client';

import type { CategoryWithLevel } from '../types';
import { CategoryTableRowCells } from './CategoryTableRowCells';

export interface CategoryDragGhostRect {
  top: number;
  left: number;
  width: number;
  height: number;
  columnWidths: number[];
}

interface CategoryDragGhostProps {
  category: CategoryWithLevel;
  subcategoryLabel: string;
  rect: CategoryDragGhostRect;
  ghostRef: React.RefObject<HTMLDivElement>;
}

export function CategoryDragGhost({
  category,
  subcategoryLabel,
  rect,
  ghostRef,
}: CategoryDragGhostProps) {
  return (
    <div
      ref={ghostRef}
      className="pointer-events-none fixed z-50 box-border overflow-hidden bg-orange-50 shadow-xl ring-1 ring-orange-200 will-change-transform"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    >
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {rect.columnWidths.map((width, index) => (
            <col key={index} style={{ width: `${width}px` }} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <CategoryTableRowCells
              category={category}
              subcategoryLabel={subcategoryLabel}
              reorderEnabled={false}
              isHandleActive
            />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
