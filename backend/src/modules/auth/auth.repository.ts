import { query, withTransaction } from '../../config/database';
import { AuthUser } from './auth.types';

export class AuthRepository {
  /**
   * Find a user by email with their roles.
   */
  async findByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
    const result = await query<any>(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
              u.phone, u.avatar_url, u.is_active, u.token_version,
              COALESCE(
                json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
                '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      tokenVersion: row.token_version,
      roles: row.roles,
    };
  }

  /**
   * Find a user by ID with their roles.
   */
  async findById(id: string): Promise<AuthUser | null> {
    const result = await query<any>(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              u.phone, u.avatar_url, u.is_active, u.token_version,
              COALESCE(
                json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
                '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      tokenVersion: row.token_version,
      roles: row.roles,
    };
  }

  /**
   * Check if an email is already registered.
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists',
      [email]
    );
    return result.rows[0].exists;
  }

  /**
   * Create a new user with role assignment.
   * Uses a transaction to ensure user + role assignment are atomic.
   */
  async createUser(
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    phone: string | undefined,
    roleName: string
  ): Promise<string> {
    return withTransaction(async (client) => {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [email, passwordHash, firstName, lastName, phone ?? null]
      );
      const userId = userResult.rows[0].id;

      // Get role ID
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );
      if (roleResult.rows.length === 0) {
        throw new Error(`Role '${roleName}' not found`);
      }
      const roleId = roleResult.rows[0].id;

      // Assign role
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );

      return userId;
    });
  }

  /**
   * Create a merchant profile linked to a user.
   */
  async createMerchant(
    userId: string,
    businessName: string,
    businessEmail?: string,
    businessPhone?: string
  ): Promise<string> {
    const result = await query<{ id: string }>(
      `INSERT INTO merchants (user_id, business_name, business_email, business_phone, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id`,
      [userId, businessName, businessEmail ?? null, businessPhone ?? null]
    );
    return result.rows[0].id;
  }

  /**
   * Create a driver profile linked to a user.
   */
  async createDriver(
    userId: string,
    licenseNumber?: string,
    vehicleType?: string,
    vehiclePlate?: string
  ): Promise<string> {
    const result = await query<{ id: string }>(
      `INSERT INTO drivers (user_id, license_number, vehicle_type, vehicle_plate, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id`,
      [userId, licenseNumber ?? null, vehicleType ?? null, vehiclePlate ?? null]
    );
    return result.rows[0].id;
  }

  /**
   * Update last login timestamp.
   */
  async updateLastLogin(userId: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  async invalidateSessions(userId: string): Promise<void> {
    await query('UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1', [userId]);
  }
}

export const authRepository = new AuthRepository();
