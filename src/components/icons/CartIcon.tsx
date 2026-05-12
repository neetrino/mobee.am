interface CartIconProps {
  /**
   * Renders at this size in px; Figma asset is authored in a 20×20 viewBox.
   */
  size?: number;
  /** Layout utilities; strokes use currentColor (Figma: white on #2db2ff). */
  className?: string;
  /** Stroke in viewBox units; Figma asset uses 2 (default). */
  strokeWidth?: number;
}

/**
 * Cart / add-to-cart icon — paths exported from Figma (node SVG `I53:684;111:4461`, file mobee-new).
 * Default stroke weight 2, round handle caps, round bag joins; matches dev-mode asset exactly.
 */
export function CartIcon({ size = 20, className = '', strokeWidth: pathStrokeWidth = 2 }: CartIconProps) {
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
        d="M2 6.3125H19L18.1128 16.0673C18.0648 16.5953 17.8212 17.0863 17.4298 17.4438C17.0384 17.8014 16.5275 17.9998 15.9974 18H5.00263C4.47248 17.9998 3.96155 17.8014 3.57016 17.4438C3.17876 17.0863 2.93517 16.5953 2.88719 16.0673L2 6.3125Z"
        stroke="currentColor"
        strokeWidth={pathStrokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M6.25 8.4375V5.25C6.25 4.12283 6.69777 3.04183 7.4948 2.2448C8.29183 1.44777 9.37283 1 10.5 1C11.6272 1 12.7082 1.44777 13.5052 2.2448C14.3022 3.04183 14.75 4.12283 14.75 5.25V8.4375"
        stroke="currentColor"
        strokeWidth={pathStrokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
