"use client";

interface ProductImagePlaceholderProps {
  className?: string;
  "aria-label"?: string;
}

/**
 * Placeholder shown when a product has no image or image failed to load.
 * Prevents broken image icon and keeps layout consistent.
 */
export function ProductImagePlaceholder({
  className = "",
  "aria-label": ariaLabel = "No image",
}: ProductImagePlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-gray-200 text-gray-400 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    </div>
  );
}
