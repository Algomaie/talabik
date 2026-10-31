import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storesApi } from '../../lib/api';
import { Store as StoreIcon, Star, Clock, MapPin, Search, X } from 'lucide-react';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await storesApi.list(1, 100);
      setStores(data.data.stores || data.data || []);
    } catch (err) {
      setError('Unable to load stores. Please try again.');
      console.error('Failed to load stores', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering by name (and secondary match on description or address)
  const filteredStores = stores.filter((store) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = (store.name || '').toLowerCase();
    const desc = (store.description || '').toLowerCase();
    const addr = (store.address || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || addr.includes(q);
  });

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen" style={{ minHeight: '40vh' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Discovering stores near you...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="page"><div role="alert">{error}</div>
      <button className="btn btn-primary" onClick={loadStores}>Retry</button></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1>Restaurants & Stores</h1>
          <p>Discover the best food and products around you.</p>
        </div>

        {/* Search Bar at the Top */}
        <div
          style={{
            maxWidth: 600,
            marginBottom: '2rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search stores by name, cuisine, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '2.75rem',
                paddingRight: searchQuery ? '2.5rem' : '1rem',
                height: 48,
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-lg)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {searchQuery && (
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Found <strong>{filteredStores.length}</strong> {filteredStores.length === 1 ? 'store' : 'stores'} matching "{searchQuery}"
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSearchQuery('')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Stores Grid */}
        {filteredStores.length > 0 ? (
          <div className="grid grid-3">
            {filteredStores.map((store) => {
              const logoUrl = store.logo_url || store.logoUrl;
              const rating = store.avg_rating || store.avgRating;

              return (
                <div
                  key={store.id}
                  className="glass-card product-card"
                  onClick={() => navigate(`/stores/${store.id}`)}
                  style={{ padding: 0, cursor: 'pointer' }}
                >
                  <div
                    className="product-image"
                    style={{
                      background: logoUrl
                        ? `url(${logoUrl}) center/cover`
                        : 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      height: 180,
                    }}
                  >
                    {!logoUrl && <StoreIcon size={48} opacity={0.4} />}
                  </div>

                  <div className="product-info" style={{ padding: '1.25rem' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <h3 className="product-name" style={{ fontSize: '1.15rem' }}>
                        {store.name}
                      </h3>
                      <div className="badge badge-warning">
                        <Star size={12} style={{ fill: 'currentColor' }} />
                        <span>{rating ? Number(rating).toFixed(1) : 'New'}</span>
                      </div>
                    </div>

                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.5em',
                      }}
                    >
                      {store.description || 'Quality food and products delivered to your door.'}
                    </p>

                    <div
                      className="flex items-center gap-3"
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}
                    >
                      <span className="flex items-center gap-1" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} /> {store.address || 'Riyadh'}
                      </span>
                      <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                        <Clock size={14} /> 20-30 min
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : stores.length > 0 && searchQuery ? (
          /* Search yielded no matches */
          <div className="glass-card empty-state">
            <Search size={56} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3>No stores found</h3>
            <p>No restaurants or stores match "{searchQuery}". Try a different keyword.</p>
            <button
              className="btn btn-ghost"
              onClick={() => setSearchQuery('')}
              style={{ marginTop: '1rem' }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Zero stores on platform */
          <div className="glass-card empty-state">
            <StoreIcon size={64} style={{ opacity: 0.4 }} />
            <h3>No stores found</h3>
            <p>Check back later for new stores in your area.</p>
          </div>
        )}
      </div>
    </div>
  );
}
