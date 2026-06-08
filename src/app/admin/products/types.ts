export interface Product {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  featured?: boolean;
  price: number;
  stock: number;
  discountPercent?: number;
  compareAtPrice?: number | null;
  colorStocks?: Array<{
    color: string;
    stock: number;
  }>;
  image: string | null;
  categoryIds?: string[];
  createdAt: string;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Category {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  requiresSizes: boolean;
}






