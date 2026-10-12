import { z } from 'zod';

export const createProductSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  name: z.string().min(1, 'Product name is required').max(255).trim(),
  description: z.string().max(2000).optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  comparePrice: z.number().min(0).optional(),
  imageUrl: z.string().url().max(500).optional(),
  quantity: z.number().int().min(0).optional().default(0),
  lowStock: z.number().int().min(0).optional().default(5),
});

export const updateProductSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).optional(),
  comparePrice: z.number().min(0).nullable().optional(),
  imageUrl: z.string().url().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  lowStock: z.number().int().min(0).optional(),
});

export const productQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  minPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  maxPrice: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  sort: z.enum(['price', '-price', 'name', '-name', 'created']).optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});
