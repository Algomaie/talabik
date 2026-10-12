export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  storeName?: string;
  addressId: string | null;
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  notes: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  idempotencyKey: string | null;
  confirmedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  total: number;
}

export interface CreateOrderDto {
  addressId: string;
  notes?: string;
  idempotencyKey?: string;
}
