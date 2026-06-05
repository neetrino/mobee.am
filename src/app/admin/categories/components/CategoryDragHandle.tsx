'use client';

import { GripVertical } from 'lucide-react';

interface CategoryDragHandleProps {
  isDragging: boolean;
  disabled?: boolean;
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export function CategoryDragHandle({
  isDragging,
  disabled = false,
  label,
  onPointerDown,
}: CategoryDragHandleProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      className={`flex size-8 shrink-0 touch-none items-center justify-center rounded-supersudo border transition-colors ${
        disabled
          ? 'cursor-not-allowed border-transparent text-gray-300'
          : isDragging
            ? 'cursor-grabbing border-blue-500 bg-blue-50 text-blue-600'
            : 'cursor-grab border-transparent text-gray-400 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-600'
      }`}
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </div>
  );
}
