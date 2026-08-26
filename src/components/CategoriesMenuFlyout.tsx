'use client';

import { Link } from '@/lib/i18n/navigation';
import { ChevronRight } from 'lucide-react';
import { createElement, useEffect, useMemo } from 'react';
import { siteMontserrat } from '@/lib/fonts/site-fonts';
import type { CategoryTreeNode } from '@/lib/category-nav';
import { categoryStripHref } from '@/lib/categoryStrip';
import { resolveCategoryMenuIcon } from '@/lib/categoryMenuIcon';
import { getHeaderDropdownPanelMotionClass, useHeaderDropdownMotion } from './HeaderSecondaryBar';

const FLYOUT_GRID_COLUMNS = 4;
/** Wide enough for long Armenian titles (e.g. ՎԱՐՍԱՀԱՐԴԱՐԻՉ) in 4 columns. */
const FLYOUT_PANEL_WIDTH_CLASS = 'w-[min(64rem,calc(100vw-2rem))]';
const montserrat = siteMontserrat;

export type CategoriesMenuFlyoutItem = CategoryTreeNode & {
  position?: number;
};

type CategoriesMenuFlyoutProps = {
  open: boolean;
  onEnteredChange?: (entered: boolean) => void;
  loading: boolean;
  roots: CategoriesMenuFlyoutItem[];
  onItemNavigate: () => void;
  loadingLabel: string;
  onLinkHover: (href: string) => void;
};

function CategoriesMenuFlyoutCard({
  category,
  onItemNavigate,
  onLinkHover,
}: {
  category: CategoriesMenuFlyoutItem;
  onItemNavigate: () => void;
  onLinkHover: (href: string) => void;
}) {
  const href = categoryStripHref(category);

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => onLinkHover(href)}
      onClick={onItemNavigate}
      className="group flex min-h-[52px] items-center gap-2.5 rounded-xl border border-transparent bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px hover:border-[#dbeafe] hover:bg-[#f8fbff] active:translate-y-0 active:bg-[#f1f7fc]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2db2ff] text-white">
        {createElement(resolveCategoryMenuIcon(category), {
          className: 'size-5',
          strokeWidth: 2,
          'aria-hidden': true,
        })}
      </span>
      <span className="min-w-0 flex-1 whitespace-nowrap text-[11px] font-bold uppercase leading-tight tracking-normal text-[#1a1a1a]">
        {category.title}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-[#d1d5db]"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}

/** Same navigable items as the legacy mega menu: each root, then its children. */
function flattenMenuCategories(roots: CategoriesMenuFlyoutItem[]): CategoriesMenuFlyoutItem[] {
  const result: CategoriesMenuFlyoutItem[] = [];
  for (const root of roots) {
    result.push(root);
    if (root.children.length > 0) {
      result.push(...root.children);
    }
  }
  return result;
}

export function CategoriesMenuFlyout({
  open,
  onEnteredChange,
  loading,
  roots,
  onItemNavigate,
  loadingLabel,
  onLinkHover,
}: CategoriesMenuFlyoutProps) {
  const { menuVisible, menuEntered } = useHeaderDropdownMotion(open);

  const displayItems = useMemo(() => flattenMenuCategories(roots), [roots]);

  useEffect(() => {
    onEnteredChange?.(menuEntered);
  }, [menuEntered, onEnteredChange]);

  if (!menuVisible) {
    return null;
  }

  return (
    <>
      <div className="absolute left-0 top-full z-[55] h-2 w-full" aria-hidden />
      <div className={`absolute left-0 top-full z-[55] pt-2 ${montserrat.className}`}>
        <div
          className={`${FLYOUT_PANEL_WIDTH_CLASS} overflow-hidden rounded-2xl border border-[#e5e7eb]/90 bg-white shadow-[0_22px_48px_-20px_rgba(15,23,42,0.32)] ${getHeaderDropdownPanelMotionClass(menuEntered)}`}
        >
          {loading ? (
            <div className="px-5 py-4 text-sm text-gray-500">{loadingLabel}</div>
          ) : (
            <div className="max-h-[min(28rem,calc(100vh-6rem))] overflow-y-auto overscroll-y-contain bg-gradient-to-b from-[#f4f6f8] to-[#eef1f4] p-4 [scrollbar-gutter:stable]">
              <div
                className="grid gap-2.5"
                style={{ gridTemplateColumns: `repeat(${FLYOUT_GRID_COLUMNS}, minmax(0, 1fr))` }}
              >
                {displayItems.map((category) => (
                  <CategoriesMenuFlyoutCard
                    key={category.id}
                    category={category}
                    onItemNavigate={onItemNavigate}
                    onLinkHover={onLinkHover}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
