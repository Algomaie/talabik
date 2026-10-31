export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'DRIVER';
  // Merchant-specific fields
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  // Driver-specific fields
  licenseNumber?: string;
  vehicleType?: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  tokenVersion: number;
  roles: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}
