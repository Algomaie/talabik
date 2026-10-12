export interface Store {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
  minOrder: number;
  deliveryFee: number;
  avgRating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreDto {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  opensAt?: string;
  closesAt?: string;
  minOrder?: number;
  deliveryFee?: number;
}

export interface UpdateStoreDto {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  opensAt?: string;
  closesAt?: string;
  minOrder?: number;
  deliveryFee?: number;
}

export interface StoreListQuery {
  search?: string;
  page: number;
  limit: number;
}
