import type { SVGAttributes } from 'react';

type GlyphProps = Omit<SVGAttributes<SVGSVGElement>, 'children'>;

const GLYPH_BOX_CLASS = 'size-5 shrink-0 text-black';

/**
 * Footer contact icons — filled glyphs aligned with Figma mobee-new:
 * phone 582:750 (vector handset — sharp at any DPR), mail 582:758, location 582:767.
 */
export function FooterContactPhoneGlyph(props: GlyphProps) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      overflow="visible"
      shapeRendering="geometricPrecision"
      className={className ?? GLYPH_BOX_CLASS}
      aria-hidden
      {...rest}
    >
      {/* Bootstrap Icons telephone-fill v1.11+ (MIT) — full handset within viewBox */}
      <path
        fillRule="evenodd"
        d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
      />
    </svg>
  );
}

export function FooterContactMailGlyph(props: GlyphProps) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="geometricPrecision"
      className={className ?? GLYPH_BOX_CLASS}
      aria-hidden
      {...rest}
    >
      {/* Heroicons envelope solid (MIT) */}
      <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
      <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
    </svg>
  );
}

export function FooterContactLocationGlyph(props: GlyphProps) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="geometricPrecision"
      className={className ?? GLYPH_BOX_CLASS}
      aria-hidden
      {...rest}
    >
      {/* Map pin with circular cutout — evenodd (matches tdesign:location-filled look) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 4.5A2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5 2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5Z"
      />
    </svg>
  );
}
