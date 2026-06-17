'use client';

/** Figma Mobee-Dev-Neew node 1:2815 (iconoir:language) — stroke globe (#757575). */
type MobileHeaderToolbarGlobeIconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function MobileHeaderToolbarGlobeIcon({
  size = 22,
  className = '',
  strokeWidth = 1.5,
}: MobileHeaderToolbarGlobeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22.5 22.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || undefined}
      aria-hidden
    >
      <path
        d="M0.75 11.25C0.75 17.0491 5.45085 21.75 11.25 21.75C17.0491 21.75 21.75 17.0491 21.75 11.25C21.75 5.45085 17.0491 0.75 11.25 0.75C5.45085 0.75 0.75 5.45085 0.75 11.25Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.2996 0.802505C12.2996 0.802505 15.4496 4.95001 15.4496 11.25C15.4496 17.55 12.2996 21.6975 12.2996 21.6975M10.1996 21.6975C10.1996 21.6975 7.04963 17.55 7.04963 11.25C7.04963 4.95001 10.1996 0.802505 10.1996 0.802505M1.41113 14.925H21.0881M1.41113 7.57501H21.0881"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
