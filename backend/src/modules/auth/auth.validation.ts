import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  phone: z.string().max(20).optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT', 'DRIVER']),
  // Merchant fields (required when role is MERCHANT)
  businessName: z.string().max(255).optional(),
  businessEmail: z.string().email().max(255).optional(),
  businessPhone: z.string().max(20).optional(),
  // Driver fields (required when role is DRIVER)
  licenseNumber: z.string().max(50).optional(),
  vehicleType: z.enum(['BICYCLE', 'MOTORCYCLE', 'CAR']).optional(),
  vehiclePlate: z.string().max(20).optional(),
}).refine(
  (data) => {
    if (data.role === 'MERCHANT' && !data.businessName) {
      return false;
    }
    return true;
  },
  { message: 'Business name is required for merchant registration', path: ['businessName'] }
).refine(
  (data) => {
    if (data.role === 'DRIVER' && !data.licenseNumber) {
      return false;
    }
    return true;
  },
  { message: 'License number is required for driver registration', path: ['licenseNumber'] }
);

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
