import { z } from 'zod';

export const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancel reason is required').max(500),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PREPARING', 'READY_FOR_PICKUP']),
});
