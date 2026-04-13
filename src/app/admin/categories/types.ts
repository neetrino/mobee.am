export interface Category {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  requiresSizes?: boolean;
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
}




