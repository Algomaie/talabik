import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storesApi, categoriesApi, productsApi, cartApi } from '../../lib/api';
import { Store, Star, ArrowLeft, Plus, Clock, MapPin, ShoppingBag } from 'lucide-react';
import './CustomerPages.css';

export default function StoreDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadStoreData();
    }
  }, [id]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      // Fetch store details
      const storeRes = await storesApi.getById(id!);
      setStore(storeRes.data.data.store);

      // Fetch categories for this store
      const catRes = await categoriesApi.listByStore(id!);
      const cats = catRes.data.data || [];
      setCategories(cats);

      // Fetch products for this store
      const prodRes = await productsApi.list({ storeId: id });
      setProducts(prodRes.data.data.products || []);
      
      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      setAddingToCart(productId);
      await cartApi.addItem(productId, 1);
      // Show mini toast (in a real app you'd use a toast context)
      const toast = document.createElement('div');
      toast.className = 'toast toast-success';
      toast.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Added to cart`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to add item';
      if (errorMsg.includes('different store')) {
        alert('You can only order from one store at a time. Please clear your cart first.');
      }
    } finally {
      setAddingToCart(null);
    }
  };

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen" style={{ minHeight: '40vh' }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="page container animate-fade-in">
        <div className="empty-state glass-card">
          <Store size={64} />
          <h3>Store not found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/stores')} style={{ marginTop: '1rem' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <button 
          className="btn btn-ghost" 
          onClick={() => navigate('/stores')}
          style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}
        >
          <ArrowLeft size={16} /> Back to Stores
        </button>

        {/* Store Header Info */}
        <div className="glass-card store-hero">
          <div className="store-hero-bg" style={{ 
            backgroundImage: store.logo_url 
              ? `url(${store.logo_url})` 
              : 'linear-gradient(135deg, var(--primary), var(--accent))' 
          }} />
          <div className="store-hero-content">
            <div className="store-logo-large">
              {!store.logo_url && <Store size={40} />}
            </div>
            <div className="store-hero-info">
              <h1>{store.name}</h1>
              <div className="store-meta">
                <span className="badge badge-warning">
                  <Star size={14} style={{ fill: 'currentColor' }} /> 
                  {store.avg_rating || 'New'}
                </span>
                <span className="meta-item"><MapPin size={16} /> {store.address || 'Location unavailable'}</span>
                <span className="meta-item"><Clock size={16} /> 20-30 min delivery</span>
              </div>
              <p className="store-desc">{store.description}</p>
            </div>
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div className="category-tabs glass-card">
          <button 
            className={`cat-tab ${!activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-4" style={{ marginTop: '2rem' }}>
          {filteredProducts.map(product => (
            <div key={product.id} className="glass-card product-card">
              <div 
                className="product-image" 
                style={{ 
                  background: product.image_url 
                    ? `url(${product.image_url}) center/cover` 
                    : 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))' 
                }}
              />
              <div className="product-info">
                <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                  <h3 className="product-name">{product.name}</h3>
                  <span className="product-price">{product.price} SAR</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {product.description}
                </p>
                <button 
                  className="btn btn-primary btn-block btn-sm"
                  onClick={() => handleAddToCart(product.id)}
                  disabled={addingToCart === product.id}
                >
                  {addingToCart === product.id ? (
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <><Plus size={16} /> Add to Cart</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="empty-state glass-card" style={{ marginTop: '2rem' }}>
            <ShoppingBag size={48} />
            <h3>No products found</h3>
            <p>This category doesn't have any products yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
