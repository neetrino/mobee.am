import type { AdminLocaleTextMap } from '@/lib/admin/admin-content-locale';

export interface Category {
  id: string;
  slug: string;
  title: string;
  titles?: AdminLocaleTextMap;
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
  titles: AdminLocaleTextMap;
  slug: string;
  parentId: string;
  requiresSizes: boolean;
  subcategoryIds: string[];
  imageUrl: string | null;
}
