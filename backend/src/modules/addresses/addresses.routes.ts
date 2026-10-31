import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/database';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { sendSuccess } from '../../common/utils/response';
import { NotFoundError } from '../../common/errors';

// ─── Types ───────────────────────────────────────────────────────

export interface Address {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

// ─── Validation ──────────────────────────────────────────────────

const createAddressSchema = z.object({
  label: z.string().min(1).max(50).trim().default('Home'),
  addressLine: z.string().min(1, 'Address is required').max(500).trim(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional().default(false),
});

const updateAddressSchema = z.object({
  label: z.string().min(1).max(50).trim().optional(),
  addressLine: z.string().min(1).max(500).trim().optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// ─── Helper ──────────────────────────────────────────────────────

function mapRow(row: any): Address {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    addressLine: row.address_line,
    city: row.city,
    area: row.area,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    isDefault: row.is_default,
  };
}

// ─── Routes ──────────────────────────────────────────────────────

const router = Router();

/** GET /api/v1/addresses — List user's addresses */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user!.id]
    );
    sendSuccess(res, { addresses: result.rows.map(mapRow) });
  } catch (error) { next(error); }
});

/** POST /api/v1/addresses — Add new address */
router.post(
  '/',
  authMiddleware,
  validate(createAddressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { label, addressLine, city, area, latitude, longitude, isDefault } = req.body;

      // If setting as default, unset other defaults
      if (isDefault) {
        await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
      }

      const result = await query(
        `INSERT INTO addresses (user_id, label, address_line, city, area, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, label, addressLine, city ?? null, area ?? null, latitude ?? null, longitude ?? null, isDefault]
      );

      sendSuccess(res, { address: mapRow(result.rows[0]) }, 201);
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/addresses/:id — Update address */
router.patch(
  '/:id',
  authMiddleware,
  validate(updateAddressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      const fieldMap: Record<string, string> = {
        label: 'label', addressLine: 'address_line', city: 'city',
        area: 'area', latitude: 'latitude', longitude: 'longitude',
      };

      for (const [key, col] of Object.entries(fieldMap)) {
        if (req.body[key] !== undefined) {
          fields.push(`${col} = $${idx}`);
          values.push(req.body[key]);
          idx++;
        }
      }

      if (fields.length === 0) {
        const existing = await query('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
        if (existing.rows.length === 0) throw new NotFoundError('Address');
        return sendSuccess(res, { address: mapRow(existing.rows[0]) });
      }

      fields.push('updated_at = NOW()');
      values.push(req.params.id, userId);

      const result = await query(
        `UPDATE addresses SET ${fields.join(', ')}
         WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0) throw new NotFoundError('Address');
      sendSuccess(res, { address: mapRow(result.rows[0]) });
    } catch (error) { next(error); }
  }
);

/** PATCH /api/v1/addresses/:id/default — Set as default */
router.patch(
  '/:id/default',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // Unset all defaults
      await query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);

      // Set the specified address as default
      const result = await query(
        'UPDATE addresses SET is_default = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
        [req.params.id, userId]
      );

      if (result.rows.length === 0) throw new NotFoundError('Address');
      sendSuccess(res, { address: mapRow(result.rows[0]) });
    } catch (error) { next(error); }
  }
);

/** DELETE /api/v1/addresses/:id — Delete address */
router.delete(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user!.id]
      );

      if (result.rows.length === 0) throw new NotFoundError('Address');
      sendSuccess(res, { message: 'Address deleted' });
    } catch (error) { next(error); }
  }
);

export default router;
