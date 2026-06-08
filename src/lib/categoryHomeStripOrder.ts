interface CategoryOrderNode {
  id: string;
  parentId: string | null;
  position: number;
  showOnHomePage?: boolean;
}

function compareByPosition(a: CategoryOrderNode, b: CategoryOrderNode): number {
  return a.position - b.position;
}

/**
 * Flatten categories in the same depth-first order as the admin categories table.
 */
export function flattenCategoriesForAdminDisplay<T extends CategoryOrderNode>(
  categories: T[],
): T[] {
  type TreeNode = T & { children: TreeNode[] };

  const categoryMap = new Map<string, TreeNode>();
  const rootCategories: TreeNode[] = [];

  categories.forEach((category) => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  categories.forEach((category) => {
    const node = categoryMap.get(category.id);
    if (!node) {
      return;
    }

    if (category.parentId && categoryMap.has(category.parentId)) {
      categoryMap.get(category.parentId)?.children.push(node);
      return;
    }

    rootCategories.push(node);
  });

  const sortChildren = (nodes: TreeNode[]): void => {
    nodes.sort(compareByPosition);
    nodes.forEach((node) => sortChildren(node.children));
  };

  sortChildren(rootCategories);

  const flattened: T[] = [];
  const walk = (nodes: TreeNode[]): void => {
    nodes.forEach((node) => {
      flattened.push(node as T);
      walk(node.children);
    });
  };

  walk(rootCategories);
  return flattened;
}

/**
 * Starred categories for the home strip, in the same order as the admin categories table.
 */
export function pickHomeStripCategories<T extends CategoryOrderNode>(
  categories: T[],
): T[] {
  return flattenCategoriesForAdminDisplay(categories).filter(
    (category) => category.showOnHomePage === true,
  );
}
