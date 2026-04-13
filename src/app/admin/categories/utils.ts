import type { Category, CategoryWithLevel } from './types';

/**
 * Build category tree with hierarchy levels
 */
export function buildCategoryTree(categories: Category[]): CategoryWithLevel[] {
  type CategoryWithLevelInternal = Category & { level: number; children?: CategoryWithLevelInternal[] };
  
  const categoryMap = new Map<string, CategoryWithLevelInternal>();
  const rootCategories: CategoryWithLevelInternal[] = [];

  // First pass: create map
  categories.forEach(cat => {
    const { children, ...catWithoutChildren } = cat;
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




