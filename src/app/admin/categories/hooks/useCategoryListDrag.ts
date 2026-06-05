'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  getSiblingItemsInDisplayOrder,
  getSiblingSlotIndexFromPointer,
  moveCategoryBlockToSiblingIndex,
} from '../utils';
import {
  animateCategoryRowShifts,
  captureCategoryRowRects,
  clearCategoryRowMotionStyles,
} from '../utils/categoryRowMotion';
import type { CategoryDragGhostRect } from '../components/CategoryDragGhost';
import type { CategoryWithLevel } from '../types';

export interface CategoryReorderPayload {
  parentId: string | null;
  categoryIds: string[];
}

interface UseCategoryListDragOptions {
  items: CategoryWithLevel[];
  reorderEnabled: boolean;
  onReorder: (payload: CategoryReorderPayload) => Promise<void>;
}

interface UseCategoryListDragResult {
  displayItems: CategoryWithLevel[];
  draggingId: string | null;
  dragGhost: CategoryDragGhostRect | null;
  ghostElementRef: React.RefObject<HTMLDivElement>;
  placeholderHeight: number;
  startDrag: (categoryId: string, event: React.PointerEvent<HTMLDivElement>) => void;
}

export function useCategoryListDrag({
  items,
  reorderEnabled,
  onReorder,
}: UseCategoryListDragOptions): UseCategoryListDragResult {
  const [displayItems, setDisplayItems] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<CategoryDragGhostRect | null>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState(64);

  const draggingIdRef = useRef<string | null>(null);
  const dragParentIdRef = useRef<string | null>(null);
  const initialSiblingOrderRef = useRef<string[]>([]);
  const displayItemsRef = useRef(items);
  const currentSiblingIndexRef = useRef<number>(-1);
  const ghostElementRef = useRef<HTMLDivElement>(null);
  const ghostOffsetYRef = useRef(0);
  const ghostBaseTopRef = useRef(0);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingClientYRef = useRef<number | null>(null);

  useEffect(() => {
    displayItemsRef.current = displayItems;
  }, [displayItems]);

  useEffect(() => {
    if (!draggingId) {
      setDisplayItems(items);
    }
  }, [items, draggingId]);

  const resetDragStyles = useCallback(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    clearCategoryRowMotionStyles();
  }, []);

  const finishDrag = useCallback(async () => {
    const draggedId = draggingIdRef.current;
    const parentId = dragParentIdRef.current;

    draggingIdRef.current = null;
    dragParentIdRef.current = null;
    currentSiblingIndexRef.current = -1;
    pendingClientYRef.current = null;
    if (pointerFrameRef.current !== null) {
      cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }

    setDraggingId(null);
    setDragGhost(null);
    if (ghostElementRef.current) {
      ghostElementRef.current.style.transform = '';
    }
    resetDragStyles();

    if (!draggedId) {
      setDisplayItems(items);
      return;
    }

    const finalSiblingOrder = getSiblingItemsInDisplayOrder(
      displayItemsRef.current,
      parentId,
    ).map((item) => item.id);

    const initialOrder = initialSiblingOrderRef.current;
    const orderChanged =
      initialOrder.length !== finalSiblingOrder.length ||
      initialOrder.some((id, index) => id !== finalSiblingOrder[index]);

    if (!orderChanged) {
      setDisplayItems(items);
      return;
    }

    try {
      await onReorder({
        parentId,
        categoryIds: finalSiblingOrder,
      });
    } catch {
      setDisplayItems(items);
    }
  }, [items, onReorder, resetDragStyles]);

  const startDrag = useCallback(
    (categoryId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (!reorderEnabled) {
        return;
      }

      const dragged = displayItemsRef.current.find((item) => item.id === categoryId);
      const row = document.querySelector(`[data-category-id="${categoryId}"]`);
      if (!dragged || !(row instanceof HTMLElement)) {
        return;
      }

      const rowRect = row.getBoundingClientRect();
      const columnWidths = Array.from(row.querySelectorAll('td')).map(
        (cell) => cell.getBoundingClientRect().width,
      );
      const siblingOrder = getSiblingItemsInDisplayOrder(
        displayItemsRef.current,
        dragged.parentId,
      ).map((item) => item.id);

      ghostOffsetYRef.current = event.clientY - rowRect.top;
      ghostBaseTopRef.current = rowRect.top;
      draggingIdRef.current = categoryId;
      dragParentIdRef.current = dragged.parentId;
      initialSiblingOrderRef.current = siblingOrder;
      currentSiblingIndexRef.current = siblingOrder.indexOf(categoryId);
      setPlaceholderHeight(Math.max(Math.round(rowRect.height), 56));
      setDragGhost({
        top: rowRect.top,
        left: rowRect.left,
        width: rowRect.width,
        height: rowRect.height,
        columnWidths,
      });
      setDraggingId(categoryId);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [reorderEnabled],
  );

  const updateGhostPosition = useCallback((clientY: number) => {
    const ghostElement = ghostElementRef.current;
    if (!ghostElement) {
      return;
    }

    const nextTop = clientY - ghostOffsetYRef.current;
    ghostElement.style.transform = `translate3d(0, ${nextTop - ghostBaseTopRef.current}px, 0)`;
  }, []);

  const processPointerMove = useCallback((clientY: number) => {
    const activeDraggedId = draggingIdRef.current;
    if (!activeDraggedId) {
      return;
    }

    updateGhostPosition(clientY);

    const nextIndex = getSiblingSlotIndexFromPointer(
      clientY,
      displayItemsRef.current,
      activeDraggedId,
      currentSiblingIndexRef.current,
    );

    if (nextIndex === null || nextIndex === currentSiblingIndexRef.current) {
      return;
    }

    const previousRects = captureCategoryRowRects(activeDraggedId);
    const moved = moveCategoryBlockToSiblingIndex(
      displayItemsRef.current,
      activeDraggedId,
      nextIndex,
    );

    if (!moved) {
      return;
    }

    currentSiblingIndexRef.current = nextIndex;
    displayItemsRef.current = moved;
    setDisplayItems(moved);
    animateCategoryRowShifts(previousRects, activeDraggedId);
  }, [updateGhostPosition]);

  useLayoutEffect(() => {
    if (!draggingId || pendingClientYRef.current === null) {
      return;
    }

    updateGhostPosition(pendingClientYRef.current);
  }, [draggingId, dragGhost, updateGhostPosition]);

  useEffect(() => {
    if (!draggingId) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      pendingClientYRef.current = event.clientY;

      if (pointerFrameRef.current !== null) {
        return;
      }

      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        const clientY = pendingClientYRef.current;
        if (clientY === null) {
          return;
        }
        processPointerMove(clientY);
      });
    };

    const handlePointerUp = () => {
      void finishDrag();
    };

    const handlePointerCancel = () => {
      void finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
    };
  }, [draggingId, finishDrag, processPointerMove]);

  return {
    displayItems,
    draggingId,
    dragGhost,
    ghostElementRef,
    placeholderHeight,
    startDrag,
  };
}
