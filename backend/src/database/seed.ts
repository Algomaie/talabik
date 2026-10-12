import { query, withTransaction } from '../config/database';
import { logger } from '../common/utils/logger';
import argon2 from 'argon2';

/**
 * Seeds the database with demo data.
 * Idempotent — safe to run multiple times.
 */
async function seed(): Promise<void> {
  logger.info('Starting database seed...');

  const password = await argon2.hash('Demo@1234', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await withTransaction(async (client) => {
    // ─── Roles ─────────────────────────────────────────────────
    logger.info('Seeding roles...');
    await client.query(`
      INSERT INTO roles (name, description) VALUES
        ('CUSTOMER', 'Regular customer who can browse and order'),
        ('MERCHANT', 'Store owner who manages products and orders'),
        ('DRIVER', 'Delivery driver who handles order deliveries'),
        ('ADMIN', 'Platform administrator with full access')
      ON CONFLICT (name) DO NOTHING
    `);

    // ─── Permissions ───────────────────────────────────────────
    logger.info('Seeding permissions...');
    await client.query(`
      INSERT INTO permissions (name, description) VALUES
        ('users:read', 'View user profiles'),
        ('users:write', 'Modify user profiles'),
        ('users:manage', 'Full user management'),
        ('stores:read', 'View stores'),
        ('stores:write', 'Create and edit own stores'),
        ('stores:manage', 'Full store management'),
        ('products:read', 'View products'),
        ('products:write', 'Create and edit own products'),
        ('products:manage', 'Full product management'),
        ('orders:create', 'Create orders'),
        ('orders:read', 'View own orders'),
        ('orders:manage', 'Full order management'),
        ('deliveries:accept', 'Accept delivery assignments'),
        ('deliveries:manage', 'Full delivery management'),
        ('reports:read', 'View reports'),
        ('audit:read', 'View audit logs'),
        ('admin:access', 'Access admin panel')
      ON CONFLICT (name) DO NOTHING
    `);

    // ─── Role-Permission Assignments ────────────────────────────
    logger.info('Seeding role permissions...');
    // Admin gets all permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);
    // Customer permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'CUSTOMER' AND p.name IN ('stores:read', 'products:read', 'orders:create', 'orders:read', 'users:read')
      ON CONFLICT DO NOTHING
    `);
    // Merchant permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'MERCHANT' AND p.name IN ('stores:read', 'stores:write', 'products:read', 'products:write', 'orders:read', 'users:read')
      ON CONFLICT DO NOTHING
    `);
    // Driver permissions
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'DRIVER' AND p.name IN ('deliveries:accept', 'orders:read', 'users:read')
      ON CONFLICT DO NOTHING
    `);

    // ─── Admin User ────────────────────────────────────────────
    logger.info('Seeding admin user...');
    const adminResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
      VALUES ('admin@talbak.com', $1, 'Admin', 'Talbak', '+966500000001', true, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [password]);
    const adminId = adminResult.rows[0].id;

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `, [adminId]);

    // ─── Merchant User ─────────────────────────────────────────
    logger.info('Seeding merchant user...');
    const merchantUserResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
      VALUES ('merchant@talbak.com', $1, 'Ahmad', 'Al-Merchant', '+966500000002', true, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [password]);
    const merchantUserId = merchantUserResult.rows[0].id;

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'MERCHANT'
      ON CONFLICT DO NOTHING
    `, [merchantUserId]);

    const merchantResult = await client.query(`
      INSERT INTO merchants (user_id, business_name, business_email, business_phone, status, approved_at)
      VALUES ($1, 'Fresh Bites Co.', 'contact@freshbites.com', '+966500000010', 'APPROVED', NOW())
      ON CONFLICT (user_id) DO UPDATE SET business_name = 'Fresh Bites Co.'
      RETURNING id
    `, [merchantUserId]);
    const merchantId = merchantResult.rows[0].id;

    // ─── Store ──────────────────────────────────────────────────
    logger.info('Seeding store...');
    const storeResult = await client.query(`
      INSERT INTO stores (merchant_id, name, slug, description, phone, address, latitude, longitude,
                          is_active, opens_at, closes_at, min_order, delivery_fee, avg_rating)
      VALUES ($1, 'Fresh Bites', 'fresh-bites',
              'Premium fresh food delivered to your door. We specialize in healthy meals, fresh juices, and artisan sandwiches.',
              '+966500000010', '123 Main Street, Riyadh',
              24.7136, 46.6753, true, '08:00', '23:00', 10.00, 5.00, 4.5)
      ON CONFLICT (slug) DO UPDATE SET name = 'Fresh Bites'
      RETURNING id
    `, [merchantId]);
    const storeId = storeResult.rows[0].id;

    // ─── Categories ─────────────────────────────────────────────
    logger.info('Seeding categories...');
    const catResults = await client.query(`
      INSERT INTO categories (store_id, name, slug, description, sort_order) VALUES
        ($1, 'Burgers', 'burgers', 'Handcrafted gourmet burgers', 1),
        ($1, 'Sandwiches', 'sandwiches', 'Fresh deli sandwiches', 2),
        ($1, 'Salads', 'salads', 'Healthy fresh salads', 3),
        ($1, 'Drinks', 'drinks', 'Fresh juices and beverages', 4),
        ($1, 'Desserts', 'desserts', 'Sweet treats and pastries', 5)
      ON CONFLICT (store_id, slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, slug
    `, [storeId]);

    const categoryMap: Record<string, string> = {};
    for (const row of catResults.rows) {
      categoryMap[row.slug] = row.id;
    }

    // ─── Products ───────────────────────────────────────────────
    logger.info('Seeding products...');
    const products = [
      { name: 'Classic Smash Burger', slug: 'classic-smash-burger', cat: 'burgers', price: 28, desc: 'Double smashed patties with melted cheddar, pickles, and secret sauce' },
      { name: 'Mushroom Swiss Burger', slug: 'mushroom-swiss-burger', cat: 'burgers', price: 32, desc: 'Grilled mushrooms, swiss cheese, and truffle aioli' },
      { name: 'Spicy Chicken Burger', slug: 'spicy-chicken-burger', cat: 'burgers', price: 30, desc: 'Crispy fried chicken with sriracha mayo and jalapeños' },
      { name: 'Club Sandwich', slug: 'club-sandwich', cat: 'sandwiches', price: 22, desc: 'Triple-decker with turkey, bacon, lettuce, and tomato' },
      { name: 'Grilled Chicken Wrap', slug: 'grilled-chicken-wrap', cat: 'sandwiches', price: 20, desc: 'Grilled chicken, mixed greens, and ranch in a flour tortilla' },
      { name: 'Caesar Salad', slug: 'caesar-salad', cat: 'salads', price: 18, desc: 'Romaine lettuce, parmesan, croutons, and classic Caesar dressing' },
      { name: 'Greek Salad', slug: 'greek-salad', cat: 'salads', price: 20, desc: 'Fresh vegetables, feta cheese, olives, and herb vinaigrette' },
      { name: 'Fresh Orange Juice', slug: 'fresh-orange-juice', cat: 'drinks', price: 12, desc: 'Freshly squeezed orange juice, no added sugar' },
      { name: 'Mango Smoothie', slug: 'mango-smoothie', cat: 'drinks', price: 15, desc: 'Blended fresh mango with yogurt and honey' },
      { name: 'Iced Coffee', slug: 'iced-coffee', cat: 'drinks', price: 14, desc: 'Cold brew coffee with milk and caramel syrup' },
      { name: 'Chocolate Brownie', slug: 'chocolate-brownie', cat: 'desserts', price: 16, desc: 'Rich dark chocolate brownie with walnut chunks' },
      { name: 'Cheesecake Slice', slug: 'cheesecake-slice', cat: 'desserts', price: 18, desc: 'New York style cheesecake with berry compote' },
    ];

    for (const p of products) {
      const prodResult = await client.query(`
        INSERT INTO products (store_id, category_id, name, slug, description, price, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (store_id, slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price
        RETURNING id
      `, [storeId, categoryMap[p.cat], p.name, p.slug, p.desc, p.price]);

      // Create inventory
      await client.query(`
        INSERT INTO inventory (product_id, quantity, low_stock)
        VALUES ($1, 50, 5)
        ON CONFLICT (product_id) DO UPDATE SET quantity = 50
      `, [prodResult.rows[0].id]);
    }

    // ─── Driver User ────────────────────────────────────────────
    logger.info('Seeding driver user...');
    const driverUserResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
      VALUES ('driver@talbak.com', $1, 'Khalid', 'Al-Driver', '+966500000003', true, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [password]);
    const driverUserId = driverUserResult.rows[0].id;

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'DRIVER'
      ON CONFLICT DO NOTHING
    `, [driverUserId]);

    await client.query(`
      INSERT INTO drivers (user_id, license_number, vehicle_type, vehicle_plate, status, availability,
                           current_latitude, current_longitude)
      VALUES ($1, 'DL-12345', 'MOTORCYCLE', 'ABC 1234', 'APPROVED', 'ONLINE', 24.7100, 46.6700)
      ON CONFLICT (user_id) DO UPDATE SET status = 'APPROVED'
    `, [driverUserId]);

    // ─── Customer User ──────────────────────────────────────────
    logger.info('Seeding customer user...');
    const customerUserResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
      VALUES ('customer@talbak.com', $1, 'Sara', 'Al-Customer', '+966500000004', true, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [password]);
    const customerUserId = customerUserResult.rows[0].id;

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, id FROM roles WHERE name = 'CUSTOMER'
      ON CONFLICT DO NOTHING
    `, [customerUserId]);

    // Customer address
    await client.query(`
      INSERT INTO addresses (user_id, label, address_line, city, area, latitude, longitude, is_default)
      VALUES ($1, 'Home', '456 Residential Street, Al Olaya', 'Riyadh', 'Al Olaya', 24.7000, 46.6800, true)
      ON CONFLICT DO NOTHING
    `, [customerUserId]);
  });

  logger.info('✅ Database seeded successfully!');
  logger.info('');
  logger.info('Demo Accounts:');
  logger.info('  Admin:    admin@talbak.com     / Demo@1234');
  logger.info('  Merchant: merchant@talbak.com  / Demo@1234');
  logger.info('  Driver:   driver@talbak.com    / Demo@1234');
  logger.info('  Customer: customer@talbak.com  / Demo@1234');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  });
