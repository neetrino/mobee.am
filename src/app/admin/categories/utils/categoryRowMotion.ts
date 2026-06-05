const ROW_SHIFT_MS = 180;

export function captureCategoryRowRects(draggingId: string | null): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  document.querySelectorAll('[data-category-id]').forEach((element) => {
    const id = element.getAttribute('data-category-id');
    if (!id || id === draggingId) {
      return;
    }
    rects.set(id, element.getBoundingClientRect());
  });
  return rects;
}

export function clearCategoryRowMotionStyles(): void {
  document.querySelectorAll('[data-category-id]').forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    element.style.transform = '';
    element.style.transition = '';
  });
}

export function animateCategoryRowShifts(
  previousRects: Map<string, DOMRect>,
  draggingId: string | null,
): void {
  requestAnimationFrame(() => {
    previousRects.forEach((previousRect, id) => {
      if (id === draggingId) {
        return;
      }

      const element = document.querySelector(`[data-category-id="${id}"]`);
      if (!(element instanceof HTMLElement)) {
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      element.style.transition = 'transform 0s';
      element.style.transform = `translate3d(0, ${deltaY}px, 0)`;

      requestAnimationFrame(() => {
        element.style.transition = `transform ${ROW_SHIFT_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        element.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  });
}
