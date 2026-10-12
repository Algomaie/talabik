import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storesApi } from '../../lib/api';
import { Store as StoreIcon, Star, Clock, MapPin } from 'lucide-react';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data } = await storesApi.list();
      setStores(data.data.stores || []);
    } catch (err) {
      console.error('Failed to load stores', err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>Restaurants & Stores</h1>
          <p>Discover the best food and products around you.</p>
        </div>

        {stores.length > 0 ? (
          <div className="grid grid-3">
            {stores.map((store) => (
              <div 
                key={store.id} 
                className="glass-card product-card"
                onClick={() => navigate(`/stores/${store.id}`)}
                style={{ padding: 0 }}
              >
                <div 
                  className="product-image" 
                  style={{ 
                    background: store.logo_url 
                      ? `url(${store.logo_url}) center/cover` 
                      : 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                  }}
                >
                  {!store.logo_url && <StoreIcon size={48} opacity={0.5} />}
                </div>
                
                <div className="product-info">
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <h3 className="product-name">{store.name}</h3>
                    <div className="badge badge-warning">
                      <Star size={12} style={{ fill: 'currentColor' }} />
                      <span>{store.avg_rating || 'New'}</span>
                    </div>
                  </div>
                  
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {store.description || 'No description available.'}
                  </p>
                  
                  <div className="flex items-center gap-3" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {store.address || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> 20-30 min
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card empty-state">
            <StoreIcon size={64} />
            <h3>No stores found</h3>
            <p>Check back later for new stores in your area.</p>
          </div>
        )}
      </div>
    </div>
  );
}
