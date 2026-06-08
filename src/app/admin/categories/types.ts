export interface Category {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  position?: number;
  requiresSizes?: boolean;
  showOnHomePage?: boolean;
  imageUrl?: string | null;
  productCount?: number;
  children?: Category[];
}

export interface CategoryWithLevel extends Category {
  level: number;
}

export interface CategoryFormData {
  title: string;
  parentId: string;
  requiresSizes: boolean;
  subcategoryIds: string[];
  imageUrl: string | null;
}

