'use client';

/** viewBox width/height (24×24). */
const VIEWBOX = 24;

/** Side shape: equal width and height so rects read as squares at any `size`. */
const SIDE_SQUARE = 4.5;

/** Soft corners on side squares (keeps shape square, not circular). */
const SIDE_SQUARE_RX = 1;

/** Symmetry axis in the 24×24 viewBox. */
const ICON_CENTER = 12;

/** Horizontal gap from center line to inner vertical edge of each square. */
const GAP_CENTER_TO_SQUARE_INNER = 3.5;

const LEFT_RECT_X = ICON_CENTER - GAP_CENTER_TO_SQUARE_INNER - SIDE_SQUARE;
const RIGHT_RECT_X = ICON_CENTER + GAP_CENTER_TO_SQUARE_INNER;

const SIDE_SQUARE_Y = ICON_CENTER - SIDE_SQUARE / 2;

/** Center divider line — extends past the squares for the compare glyph. */
const CENTER_LINE_Y1 = 6;
const CENTER_LINE_Y2 = 18;

interface CompareIconProps {
  /**
   * Optional custom size in pixels; defaults to 18.
   */
  size?: number;
  /**
   * Stroke width in user units (viewBox 0 0 24 24).
   */
  strokeWidth?: number;
  /**
   * Allows passing custom utility classes for color/spacing.
   */
  className?: string;
  /**
   * Preserved for API compatibility; color comes from parent via currentColor.
   */
  isActive?: boolean;
}

/**
 * Compare glyph — two rounded squares with a taller center stroke (Figma mobee-new Top Bar);
 * not Lucide Shuffle.
 */
export function CompareIcon({
  size = 18,
  strokeWidth = 1.5,
  className = '',
}: CompareIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || undefined}
      aria-hidden
    >
      <rect
        x={LEFT_RECT_X}
        y={SIDE_SQUARE_Y}
        width={SIDE_SQUARE}
        height={SIDE_SQUARE}
        rx={SIDE_SQUARE_RX}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <line
        x1={ICON_CENTER}
        y1={CENTER_LINE_Y1}
        x2={ICON_CENTER}
        y2={CENTER_LINE_Y2}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <rect
        x={RIGHT_RECT_X}
        y={SIDE_SQUARE_Y}
        width={SIDE_SQUARE}
        height={SIDE_SQUARE}
        rx={SIDE_SQUARE_RX}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  );
}
