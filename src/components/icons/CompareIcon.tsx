'use client';

interface CompareIconProps {
  /**
   * Optional custom size in pixels; defaults to 20.
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
 * Compare glyph from Figma mobee-new Top Bar (node 1:408) — two vertical capsules
 * with a taller center stroke; matches header PNG, not Lucide Shuffle.
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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || undefined}
      aria-hidden
    >
      {/* Left vertical pill */}
      <rect
        x="5"
        y="8"
        width="3.5"
        height="9"
        rx="1.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Center line — slightly taller than the pills */}
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Right vertical pill */}
      <rect
        x="15.5"
        y="8"
        width="3.5"
        height="9"
        rx="1.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
    </svg>
  );
}
