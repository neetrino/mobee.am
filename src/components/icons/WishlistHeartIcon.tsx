'use client';

/**
 * Heart glyph from Figma mobee-new (Top Bar wishlist SVG + Product Card button vector).
 * viewBox 0 0 24 24; default stroke matches MCP asset 56872889-15a2-48ee-a93c-3a307b03802d.
 */
/** Default stroke in 24×24 viewBox; matches historical Figma asset. */
const DEFAULT_STROKE_WIDTH = 1.5;

interface WishlistHeartIconProps {
  filled?: boolean;
  size?: number;
  /** Outline stroke in user units; default matches product cards / Figma. */
  strokeWidth?: number;
  className?: string;
}

export function WishlistHeartIcon({
  filled = false,
  size = 24,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  className,
}: WishlistHeartIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M7.25977 3.5C4.63677 3.5 2.50977 5.76 2.50977 8.547C2.50977 14.125 11.5098 20.5 11.5098 20.5C11.5098 20.5 20.5098 14.125 20.5098 8.547C20.5098 5.094 18.3828 3.5 15.7598 3.5C13.8998 3.5 12.2898 4.636 11.5098 6.29C10.7298 4.636 9.11977 3.5 7.25977 3.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
