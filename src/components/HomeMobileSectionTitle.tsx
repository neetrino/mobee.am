'use client';

import type { ReactNode } from 'react';

type HomeMobileSectionTitleProps = {
  title: string;
  /** Optional DOM id when this heading is the primary visible title for the section. */
  sectionHeadingId?: string;
  /** Synced with the horizontal product carousel below (mobile). */
  syncedCarouselPageIndex?: number;
  syncedCarouselPageCount?: number;
  /** Overrides default `text-lg` heading styles (e.g. PDP related block). */
  titleClassName?: string;
  /** Overrides default outer row layout (padding / nudge); default matches home mobile. */
  rootClassName?: string;
  /** When true, page dots are not shown in this row (e.g. PDP related — dots under the carousel). */
  hideIndicators?: boolean;
  /** Renders at the end of the row (e.g. carousel prev/next beside the title). */
  trailing?: ReactNode;
};

const HOME_MOBILE_SECTION_TITLE_ROOT_DEFAULT =
  'flex items-center justify-between px-4 pt-4 lg:hidden';

const HOME_MOBILE_CAROUSEL_PAGE_ACTIVE_DOT_CLASS =
  'h-1 w-4 shrink-0 rounded-full bg-[#2db2ff]';
const HOME_MOBILE_CAROUSEL_PAGE_INACTIVE_DOT_CLASS =
  'h-1 w-1.5 shrink-0 rounded-full bg-[#d1d5db]';

type HomeMobileCarouselPageIndicatorsProps = {
  pageIndex?: number;
  pageCount?: number;
  className?: string;
};

/**
 * Pill strip matching home mobile section — carousel page index (or three placeholder dots).
 */
export function HomeMobileCarouselPageIndicators({
  pageIndex = 0,
  pageCount,
  className = '',
}: HomeMobileCarouselPageIndicatorsProps) {
  const useSynced = typeof pageCount === 'number' && pageCount >= 1;

  const indicators = (() => {
    if (!useSynced) {
      return (
        <>
          <span className={HOME_MOBILE_CAROUSEL_PAGE_ACTIVE_DOT_CLASS} />
          <span className={HOME_MOBILE_CAROUSEL_PAGE_INACTIVE_DOT_CLASS} />
          <span className={HOME_MOBILE_CAROUSEL_PAGE_INACTIVE_DOT_CLASS} />
        </>
      );
    }
    const count = pageCount;
    const active = Math.min(count - 1, Math.max(0, pageIndex));
    return [...Array(count)].map((_, i) => (
      <span
        key={i}
        className={i === active ? HOME_MOBILE_CAROUSEL_PAGE_ACTIVE_DOT_CLASS : HOME_MOBILE_CAROUSEL_PAGE_INACTIVE_DOT_CLASS}
      />
    ));
  })();

  return (
    <div
      className={`flex h-1 min-w-0 shrink-0 items-center justify-center gap-1.5 ${className}`.trim()}
      aria-hidden
    >
      {indicators}
    </div>
  );
}

/**
 * Compact section title row for home mobile layout (Figma mobee-new mobile frame).
 */
export function HomeMobileSectionTitle({
  title,
  sectionHeadingId,
  syncedCarouselPageIndex = 0,
  syncedCarouselPageCount,
  titleClassName,
  rootClassName,
  hideIndicators = false,
  trailing = null,
}: HomeMobileSectionTitleProps) {
  const useSynced =
    typeof syncedCarouselPageCount === 'number' && syncedCarouselPageCount >= 1;

  const titleBaseClass = titleClassName ?? 'text-lg font-bold leading-snug text-[#303030]';
  const titleLayoutClass = trailing != null ? 'min-w-0 flex-1' : '';

  return (
    <div className={rootClassName ?? HOME_MOBILE_SECTION_TITLE_ROOT_DEFAULT}>
      <h2 id={sectionHeadingId} className={`${titleBaseClass} ${titleLayoutClass}`.trim()}>
        {title}
      </h2>
      {!hideIndicators ? (
        <div className="ml-2 flex h-1 min-w-0 shrink-0 items-center justify-end gap-1.5">
          <HomeMobileCarouselPageIndicators
            pageIndex={syncedCarouselPageIndex}
            pageCount={useSynced ? syncedCarouselPageCount : undefined}
          />
        </div>
      ) : null}
      {trailing != null ? (
        <div className="ml-2 flex shrink-0 items-center gap-0.5">{trailing}</div>
      ) : null}
    </div>
  );
}
