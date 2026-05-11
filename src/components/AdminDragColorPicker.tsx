'use client';

import { HexColorPicker } from 'react-colorful';
import { normalizeHexToSixDigits, safeHexForPicker } from '../lib/hexColorUtils';

export interface AdminDragColorPickerProps {
  color: string | null | undefined;
  onChange: (hex: string) => void;
  className?: string;
  /** When current value is empty/invalid, picker starts from this hex. */
  emptyFallbackHex?: string;
}

const ROOT_CLASS =
  'w-full max-w-[280px] overflow-hidden rounded-lg shadow-sm ring-1 ring-gray-200/80';

/**
 * Interactive saturation + hue sliders (no RGB inputs). Uses react-colorful.
 */
export function AdminDragColorPicker({
  color,
  onChange,
  className = '',
  emptyFallbackHex,
}: AdminDragColorPickerProps) {
  const safe = safeHexForPicker(color, emptyFallbackHex ?? undefined);

  return (
    <HexColorPicker
      color={safe}
      onChange={(next) => onChange(normalizeHexToSixDigits(next))}
      className={[ROOT_CLASS, className].filter(Boolean).join(' ')}
    />
  );
}
