/**
 * Ref-counted document scroll lock. Pairs with `scrollbar-gutter: stable` on `html` (globals.css)
 * to avoid layout jump when the scrollbar is toggled — a common cause of modal-close jank.
 */
let lockCount = 0;
let stored: { bodyOverflow: string; htmlOverflow: string } | null = null;

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const body = document.body;
  const html = document.documentElement;

  if (lockCount === 0) {
    stored = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
  }

  lockCount += 1;

  return () => {
    lockCount -= 1;
    if (lockCount !== 0 || !stored) {
      return;
    }
    body.style.overflow = stored.bodyOverflow;
    html.style.overflow = stored.htmlOverflow;
    stored = null;
  };
}
