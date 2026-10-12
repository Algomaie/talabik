export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  quantity: number;
  lowStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  storeId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  quantity?: number;
  lowStock?: number;
}

export interface UpdateProductDto {
  categoryId?: string | null;
  name?: string;
  description?: string;
  price?: number;
  comparePrice?: number | null;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ProductListQuery {
  storeId?: string;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price' | '-price' | 'name' | '-name' | 'created';
  page: number;
  limit: number;
}
