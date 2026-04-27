'use client';

type HomeMobileSectionTitleProps = {
  title: string;
  /** Optional DOM id when this heading is the primary visible title for the section. */
  sectionHeadingId?: string;
};

/**
 * Compact section title row for home mobile layout (Figma mobee-new mobile frame).
 */
export function HomeMobileSectionTitle({ title, sectionHeadingId }: HomeMobileSectionTitleProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
      <h2
        id={sectionHeadingId}
        className="text-base font-bold leading-normal text-[#303030]"
      >
        {title}
      </h2>
      <div className="flex h-1 w-[46px] shrink-0 items-center justify-end gap-1.5" aria-hidden>
        <span className="h-1 w-4 rounded-full bg-[#2db2ff]" />
        <span className="h-1 w-1.5 rounded-full bg-[#d1d5db]" />
        <span className="h-1 w-1.5 rounded-full bg-[#d1d5db]" />
      </div>
    </div>
  );
}
