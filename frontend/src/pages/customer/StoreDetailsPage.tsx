import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storesApi, categoriesApi, productsApi, cartApi, ratingsApi } from '../../lib/api';
import {
  Store, Star, ArrowLeft, Plus, Minus, Clock, MapPin,
  ShoppingBag, X, Check, MessageSquare
} from 'lucide-react';
import './CustomerPages.css';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at?: string;
  createdAt?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  userName?: string;
}

export default function StoreDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Quantity modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);

  // Mini toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadStoreData();
    }
  }, [id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadStoreData = async () => {
    try {
      setLoading(true);
      // Fetch store details
      const storeRes = await storesApi.getById(id!);
      setStore(storeRes.data?.data?.store || storeRes.data?.data);

      // Fetch categories for this store
      const catRes = await categoriesApi.listByStore(id!).catch(() => ({ data: { data: [] } }));
      const cats = catRes.data?.data?.categories || [];
      setCategories(cats);

      // Fetch products for this store
      const prodRes = await productsApi.list({ storeId: id }).catch(() => ({ data: { data: { products: [] } } }));
      const prods = prodRes.data?.data?.products || prodRes.data?.data || [];
      setProducts(prods);

      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
      }

      // Fetch store reviews / ratings
      try {
        const ratingRes = await ratingsApi.storeRatings(id!);
        const rawReviews =
          ratingRes.data?.data?.ratings ||
          ratingRes.data?.data?.reviews ||
          (Array.isArray(ratingRes.data?.data) ? ratingRes.data.data : []);
        setReviews(rawReviews);
      } catch (err) {
        console.warn('Could not load store reviews', err);
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to load store data', err);
    } finally {
      setLoading(false);
    }
  };

  const openQuantityModal = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setAddToCartError(null);
  };

  const closeQuantityModal = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setAddToCartError(null);
    setAddingToCart(false);
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedProduct) return;

    try {
      setAddingToCart(true);
      setAddToCartError(null);
      await cartApi.addItem(selectedProduct.id, quantity);
      showToast(`Added ${quantity} × ${selectedProduct.name} to cart!`);
      closeQuantityModal();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to add item to cart';
      if (errorMsg.toLowerCase().includes('different store')) {
        setAddToCartError('You have items from another store in your cart. Please clear your cart first.');
      } else {
        setAddToCartError(errorMsg);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory || p.categoryId === activeCategory)
    : products;

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen" style={{ minHeight: '40vh' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading store details...</p>
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
            Go Back to Stores
          </button>
        </div>
      </div>
    );
  }

  // Calculate review average if available
  const avgScore =
    store.avg_rating ||
    store.avgRating ||
    (reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : null);

  return (
    <div className="page animate-fade-in">
      <div className="container">
        {toastMessage && (
          <div className="toast toast-success">
            <Check size={20} />
            <span>{toastMessage}</span>
          </div>
        )}

        <button
          className="btn btn-ghost"
          onClick={() => navigate('/stores')}
          style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem' }}
        >
          <ArrowLeft size={16} /> Back to Stores
        </button>

        {/* Store Header Info */}
        <div className="glass-card store-hero">
          <div
            className="store-hero-bg"
            style={{
              backgroundImage: store.logo_url || store.logoUrl
                ? `url(${store.logo_url || store.logoUrl})`
                : 'linear-gradient(135deg, var(--primary), var(--accent))',
            }}
          />
          <div className="store-hero-content">
            <div className="store-logo-large">
              {!store.logo_url && !store.logoUrl && <Store size={40} />}
              {(store.logo_url || store.logoUrl) && (
                <img
                  src={store.logo_url || store.logoUrl}
                  alt={store.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              )}
            </div>
            <div className="store-hero-info">
              <h1>{store.name}</h1>
              <div className="store-meta">
                <span className="badge badge-warning">
                  <Star size={14} style={{ fill: 'currentColor' }} />
                  {avgScore ? `${avgScore} / 5` : 'New'}
                </span>
                <span className="meta-item">
                  <MapPin size={16} /> {store.address || 'Location unavailable'}
                </span>
                <span className="meta-item">
                  <Clock size={16} /> 20-30 min delivery
                </span>
              </div>
              <p className="store-desc">{store.description || 'Delicious meals delivered fresh to your door.'}</p>
            </div>
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div className="category-tabs glass-card">
          <button
            className={`cat-tab ${!activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => (
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
          {filteredProducts.map((product) => {
            const prodImg = product.image_url || product.imageUrl;
            return (
              <div key={product.id} className="glass-card product-card">
                <div
                  className="product-image"
                  style={{
                    background: prodImg
                      ? `url(${prodImg}) center/cover`
                      : 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!prodImg && <ShoppingBag size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
                </div>
                <div className="product-info">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                    <h3 className="product-name">{product.name}</h3>
                    <span className="product-price">{product.price} SAR</span>
                  </div>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.4em',
                    }}
                  >
                    {product.description || 'Freshly made with quality ingredients.'}
                  </p>
                  <button
                    className="btn btn-primary btn-block btn-sm"
                    onClick={() => openQuantityModal(product)}
                  >
                    <Plus size={16} /> Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="empty-state glass-card" style={{ marginTop: '2rem' }}>
            <ShoppingBag size={48} />
            <h3>No products found</h3>
            <p>This category doesn't have any products available yet.</p>
          </div>
        )}

        {/* Reviews Section */}
        <div style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={22} style={{ color: 'var(--accent)' }} />
                Customer Reviews
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 2 }}>
                What verified customers are saying about {store.name}
              </p>
            </div>

            {avgScore && (
              <div
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                }}
              >
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>
                  {avgScore}
                </div>
                <div>
                  <div style={{ display: 'flex', color: 'var(--warning)', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        style={{
                          fill: star <= Math.round(Number(avgScore)) ? 'currentColor' : 'transparent',
                          color: 'var(--warning)',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="empty-state glass-card" style={{ padding: '3rem 1.5rem' }}>
              <Star size={44} style={{ opacity: 0.3, color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>No reviews yet</h3>
              <p style={{ fontSize: '0.875rem', maxWidth: 400 }}>
                This store doesn't have any reviews yet. Place an order to be the first to leave feedback!
              </p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: '1.25rem' }}>
              {reviews.map((review) => {
                const authorName =
                  review.user?.first_name ||
                  review.user?.name ||
                  review.userName ||
                  'Customer';
                const dateStr = review.created_at || review.createdAt;

                return (
                  <div
                    key={review.id}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {authorName}
                        </div>
                        <div style={{ display: 'flex', color: 'var(--warning)', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              style={{
                                fill: s <= review.rating ? 'currentColor' : 'transparent',
                                color: 'var(--warning)',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <p
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          fontStyle: review.comment ? 'normal' : 'italic',
                        }}
                      >
                        {review.comment || 'Rating only, no written comment.'}
                      </p>
                    </div>

                    {dateStr && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '1rem',
                          borderTop: '1px solid var(--border)',
                          paddingTop: '0.5rem',
                        }}
                      >
                        {new Date(dateStr).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quantity Selector Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={closeQuantityModal}>
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-header">
              <h3>Add to Cart</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={closeQuantityModal}
                style={{ padding: 4, border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Product summary in modal */}
            <div
              className="flex items-center gap-3"
              style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
              }}
            >
              {(selectedProduct.image_url || selectedProduct.imageUrl) ? (
                <img
                  src={selectedProduct.image_url || selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <ShoppingBag size={24} />
                </div>
              )}

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', marginBottom: 2 }}>{selectedProduct.name}</h4>
                <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {selectedProduct.price} SAR
                </div>
              </div>
            </div>

            {/* Quantity Picker (1 - 10) */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Select Quantity (1 - 10)
              </label>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  background: 'var(--bg-tertiary)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={{ width: 34, height: 34 }}
                  title="Decrease"
                >
                  <Minus size={16} />
                </button>

                <span
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    width: 40,
                    textAlign: 'center',
                    color: 'var(--text-primary)',
                  }}
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  style={{ width: 34, height: 34 }}
                  title="Increase"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Total preview */}
              <div style={{ marginTop: '1rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Total:{' '}
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  {(parseFloat(selectedProduct.price || 0) * quantity).toFixed(2)} SAR
                </strong>
              </div>
            </div>

            {addToCartError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--error-bg)',
                  color: 'var(--error)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                {addToCartError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={closeQuantityModal}
                disabled={addingToCart}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleConfirmAddToCart}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                ) : (
                  <>Add {quantity} to Cart</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
