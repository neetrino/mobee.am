/**
 * Order summary column (cart / checkout / order details): wrap the panel in this class on the
 * **grid/flex child** that should stick — not only on the inner card.
 *
 * **`self-start min-w-0`** — default grid stretch makes the cell as tall as the main column; that
 * breaks `position: sticky` so the panel scrolls under the fixed {@link ../components/Header.tsx}.
 *
 * **`top-[12rem]` / `lg:top-[9rem]`** — clears mobile stacked strips + notched safe areas margin;
 * at `lg+`, clears docked primary (~62px) + secondary (~52px) rows when both can sit fixed.
 *
 * **Tailwind:** keep arbitrary utilities as literal substrings so JIT emits them (`src/lib` is in
 * `tailwind.config.ts` `content`).
 */
export const ORDER_SUMMARY_SIDEBAR_STICKY_OUTER_CLASS =
  'self-start min-w-0 sticky top-[12rem] lg:top-[9rem]';
