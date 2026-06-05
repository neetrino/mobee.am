export interface Category {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  position?: number;
  requiresSizes?: boolean;
  homeStripPosition?: number | null;
  imageUrl?: string | null;
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
  homeStripPosition: number | null;
  imageUrl: string | null;
}




