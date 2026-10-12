const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'talbak',
  password: 'postgres123',
  port: 5432,
});

async function seed() {
  try {
    const stores = await pool.query('SELECT id, merchant_id FROM stores LIMIT 1');
    if (stores.rows.length === 0) {
      console.log('No stores found, skipping seed.');
      return;
    }
    const storeId = stores.rows[0].id;
    
    // Create categories
    const catMap = {};
    const catNames = ['Burgers', 'Drinks', 'Sides'];
    const catSlugs = ['burgers', 'drinks', 'sides'];
    
    for (let i = 0; i < 3; i++) {
      const name = catNames[i];
      const slug = catSlugs[i];
      
      const exists = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (exists.rows.length > 0) {
        catMap[name] = exists.rows[0].id;
      } else {
        const res = await pool.query(
          'INSERT INTO categories (store_id, name, slug, description, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [storeId, name, slug, name + ' desc', i]
        );
        catMap[name] = res.rows[0].id;
      }
    }
    
    // Create products
    const products = [
      { catId: catMap['Burgers'], name: 'Classic Smash', slug: 'classic-smash', desc: 'Double beef patty with cheese', price: 29.00, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
      { catId: catMap['Burgers'], name: 'Spicy Chicken', slug: 'spicy-chicken', desc: 'Crispy chicken breast with spicy mayo', price: 26.00, img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80' },
      { catId: catMap['Drinks'], name: 'Cola', slug: 'cola', desc: 'Ice cold cola', price: 6.00, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80' },
      { catId: catMap['Sides'], name: 'Fries', slug: 'fries', desc: 'Crispy golden fries', price: 12.00, img: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80' }
    ];
    
    for (const p of products) {
      const exists = await pool.query('SELECT id FROM products WHERE slug = $1', [p.slug]);
      if (exists.rows.length === 0) {
        await pool.query(
          'INSERT INTO products (store_id, category_id, name, slug, description, price, image_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)',
          [storeId, p.catId, p.name, p.slug, p.desc, p.price, p.img]
        );
      }
    }
    
    console.log('Successfully seeded categories and products for store:', storeId);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

seed();
