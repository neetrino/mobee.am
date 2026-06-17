interface ProductCardQuickAddIconProps {
  size?: number;
  className?: string;
}

/** Figma mobee-dev-neew card node 1:3248 — white plus on #2db2ff cart control. */
export function ProductCardQuickAddIcon({
  size = 20,
  className = '',
}: ProductCardQuickAddIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M9.66667 4V17.3333M16.3333 10.6667H3"
        stroke="currentColor"
        strokeWidth="2.08333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
