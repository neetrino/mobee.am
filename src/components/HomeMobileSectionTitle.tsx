'use client';

type HomeMobileSectionTitleProps = {
  title: string;
  /** Optional DOM id when this heading is the primary visible title for the section. */
  sectionHeadingId?: string;
  /** Synced with the horizontal product carousel below (mobile). */
  syncedCarouselPageIndex?: number;
  syncedCarouselPageCount?: number;
};

const ACTIVE_DOT_CLASS = 'h-1 w-4 shrink-0 rounded-full bg-[#2db2ff]';
const INACTIVE_DOT_CLASS = 'h-1 w-1.5 shrink-0 rounded-full bg-[#d1d5db]';

/**
 * Compact section title row for home mobile layout (Figma mobee-new mobile frame).
 */
export function HomeMobileSectionTitle({
  title,
  sectionHeadingId,
  syncedCarouselPageIndex = 0,
  syncedCarouselPageCount,
}: HomeMobileSectionTitleProps) {
  const useSynced =
    typeof syncedCarouselPageCount === 'number' && syncedCarouselPageCount >= 1;

  const indicators = (() => {
    if (!useSynced) {
      return (
        <>
          <span className={ACTIVE_DOT_CLASS} />
          <span className={INACTIVE_DOT_CLASS} />
          <span className={INACTIVE_DOT_CLASS} />
        </>
      );
    }
    const count = syncedCarouselPageCount;
    const active = Math.min(count - 1, Math.max(0, syncedCarouselPageIndex));
    return [...Array(count)].map((_, i) => (
      <span key={i} className={i === active ? ACTIVE_DOT_CLASS : INACTIVE_DOT_CLASS} />
    ));
  })();

  return (
    <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
      <h2
        id={sectionHeadingId}
        className="text-lg font-bold leading-snug text-[#303030]"
      >
        {title}
      </h2>
      <div
        className="ml-2 flex h-1 min-w-0 shrink-0 items-center justify-end gap-1.5"
        aria-hidden
      >
        {indicators}
      </div>
    </div>
  );
}
