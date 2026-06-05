import type { Category, CategoryWithLevel } from './types';

function compareByPosition(a: Category, b: Category): number {
  return (a.position ?? 0) - (b.position ?? 0);
}

/**
 * Build category tree with hierarchy levels
 */
export function buildCategoryTree(categories: Category[]): CategoryWithLevel[] {
  type CategoryWithLevelInternal = Category & { level: number; children?: CategoryWithLevelInternal[] };
  
  const categoryMap = new Map<string, CategoryWithLevelInternal>();
  const rootCategories: CategoryWithLevelInternal[] = [];

  // First pass: create map
  categories.forEach(cat => {
    const { children: _children, ...catWithoutChildren } = cat;
    categoryMap.set(cat.id, { ...catWithoutChildren, level: 0 });
  });

  // Second pass: build tree
  categories.forEach(cat => {
    const categoryNode = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      if (!parent.children) {
        parent.children = [];
      }
      categoryNode.level = (parent.level || 0) + 1;
      parent.children.push(categoryNode);
    } else {
      rootCategories.push(categoryNode);
    }
  });

  const sortChildren = (nodes: CategoryWithLevelInternal[]): void => {
    nodes.sort(compareByPosition);
    nodes.forEach((node) => {
      if (node.children) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(rootCategories);

  // Flatten tree for display
  const flattenTree = (
    nodes: CategoryWithLevelInternal[], 
    result: CategoryWithLevel[] = []
  ): CategoryWithLevel[] => {
    nodes.forEach(node => {
      result.push({ ...node, level: node.level });
      if (node.children) {
        flattenTree(node.children, result);
      }
    });
    return result;
  };

  return flattenTree(rootCategories);
}

export function getSubcategoryTitles(
  categoryId: string,
  categories: Category[],
): string {
  const children = categories
    .filter((item) => item.parentId === categoryId)
    .sort(compareByPosition);

  if (children.length === 0) {
    return '';
  }

  return children.map((child) => child.title).join(', ');
}

export function getCategoryBlockEndIndex(
  items: CategoryWithLevel[],
  startIndex: number,
): number {
  const level = items[startIndex]?.level ?? 0;
  let end = startIndex + 1;
  while (end < items.length && items[end].level > level) {
    end += 1;
  }
  return end;
}

export function getSiblingItemsInDisplayOrder(
  items: CategoryWithLevel[],
  parentId: string | null,
): CategoryWithLevel[] {
  return items.filter((item) => item.parentId === parentId);
}

export function getSiblingSlotIndexFromPointer(
  clientY: number,
  items: CategoryWithLevel[],
  draggedId: string,
  stableIndex: number,
): number | null {
  const dragged = items.find((item) => item.id === draggedId);
  if (!dragged) {
    return null;
  }

  const siblings = getSiblingItemsInDisplayOrder(items, dragged.parentId);
  const slotMetrics = siblings.map((sibling) => {
    const selector =
      sibling.id === draggedId
        ? `[data-category-placeholder="${draggedId}"]`
        : `[data-category-id="${sibling.id}"]`;
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    return {
      center: rect.top + rect.height / 2,
      height: rect.height,
    };
  });

  if (slotMetrics.some((metric) => metric === null)) {
    return null;
  }

  let nextIndex = siblings.length - 1;
  for (let index = 0; index < slotMetrics.length; index += 1) {
    const metric = slotMetrics[index];
    if (metric && clientY < metric.center) {
      nextIndex = index;
      break;
    }
  }

  if (nextIndex === stableIndex) {
    return null;
  }

  if (stableIndex >= 0 && stableIndex < slotMetrics.length) {
    const currentMetric = slotMetrics[stableIndex];
    if (currentMetric) {
      const deadZone = Math.max(18, currentMetric.height * 0.22);
      if (Math.abs(clientY - currentMetric.center) < deadZone) {
        return null;
      }
    }
  }

  return nextIndex;
}

export function moveCategoryBlockToSiblingIndex(
  items: CategoryWithLevel[],
  draggedId: string,
  newSiblingIndex: number,
): CategoryWithLevel[] | null {
  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  if (draggedIndex === -1) {
    return null;
  }

  const dragged = items[draggedIndex];
  const siblings = getSiblingItemsInDisplayOrder(items, dragged.parentId);
  const currentSiblingIndex = siblings.findIndex((item) => item.id === draggedId);

  if (
    currentSiblingIndex === -1 ||
    newSiblingIndex < 0 ||
    newSiblingIndex >= siblings.length ||
    currentSiblingIndex === newSiblingIndex
  ) {
    return null;
  }

  const blockEnd = getCategoryBlockEndIndex(items, draggedIndex);
  const block = items.slice(draggedIndex, blockEnd);
  const withoutBlock = [...items.slice(0, draggedIndex), ...items.slice(blockEnd)];

  const targetSibling = siblings[newSiblingIndex];
  if (!targetSibling) {
    return null;
  }

  let insertIndex = withoutBlock.findIndex((item) => item.id === targetSibling.id);
  if (insertIndex === -1) {
    return null;
  }

  if (newSiblingIndex > currentSiblingIndex) {
    insertIndex = getCategoryBlockEndIndex(withoutBlock, insertIndex);
  }

  const next = [...withoutBlock];
  next.splice(insertIndex, 0, ...block);
  return next;
}

export function moveCategoryInFlatList(
  items: CategoryWithLevel[],
  draggedId: string,
  targetId: string,
): CategoryWithLevel[] | null {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const toIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null;
  }

  const dragged = items[fromIndex];
  const target = items[toIndex];
  if (dragged.parentId !== target.parentId) {
    return null;
  }

  const next = [...items];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, dragged);
  return next;
}

export function reorderSiblingCategories(
  categories: Category[],
  draggedId: string,
  targetId: string,
): { parentId: string | null; categoryIds: string[] } | null {
  const dragged = categories.find((item) => item.id === draggedId);
  const target = categories.find((item) => item.id === targetId);

  if (!dragged || !target || dragged.parentId !== target.parentId) {
    return null;
  }

  const siblingIds = categories
    .filter((item) => item.parentId === dragged.parentId)
    .sort(compareByPosition)
    .map((item) => item.id);

  const fromIndex = siblingIds.indexOf(draggedId);
  const toIndex = siblingIds.indexOf(targetId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null;
  }

  const nextIds = [...siblingIds];
  nextIds.splice(fromIndex, 1);
  nextIds.splice(toIndex, 0, draggedId);

  return {
    parentId: dragged.parentId,
    categoryIds: nextIds,
  };
}




