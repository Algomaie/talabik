import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(255).trim(),
  description: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm').optional(),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm').optional(),
  minOrder: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm').optional(),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm').optional(),
  minOrder: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
});
