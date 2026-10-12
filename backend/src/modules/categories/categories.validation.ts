import { z } from 'zod';

export const createCategorySchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  name: z.string().min(1, 'Category name is required').max(100).trim(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
