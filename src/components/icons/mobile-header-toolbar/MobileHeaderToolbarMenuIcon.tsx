'use client';

/** Figma Mobee-Dev-Neew node 1:2809 — burger bars (#757575, inside 44px circle). */
const MENU_GLYPH_PATH =
  'M14 28H30C30.55 28 31 27.55 31 27C31 26.45 30.55 26 30 26H14C13.45 26 13 26.45 13 27C13 27.55 13.45 28 14 28ZM14 23H30C30.55 23 31 22.55 31 22C31 21.45 30.55 21 30 21H14C13.45 21 13 21.45 13 22C13 22.55 13.45 23 14 23ZM13 17C13 17.55 13.45 18 14 18H30C30.55 18 31 17.55 31 17C31 16.45 30.55 16 30 16H14C13.45 16 13 16.45 13 17Z';

type MobileHeaderToolbarMenuIconProps = {
  size?: number;
  className?: string;
};

export function MobileHeaderToolbarMenuIcon({
  size = 44,
  className = '',
}: MobileHeaderToolbarMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || undefined}
      aria-hidden
    >
      <path d={MENU_GLYPH_PATH} fill="currentColor" />
    </svg>
  );
}
