import { useEffect, useState } from 'react';
import { deliveriesApi } from '../../lib/api';
import { Truck, MapPin, CheckCircle, Navigation, Clock } from 'lucide-react';
import '../customer/CustomerPages.css';

export default function DriverDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Try to fetch currently assigned delivery first
      const myDeliveries = await deliveriesApi.history({ limit: 1 }); // We assume the most recent is active
      const active = myDeliveries.data.data?.find((d: any) => 
        ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)
      );
      
      if (active) {
        setActiveDelivery(active);
        setDeliveries([]);
      } else {
        setActiveDelivery(null);
        // Fetch available deliveries
        const res = await deliveriesApi.available();
        setDeliveries(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, id: string) => {
    try {
      setActionLoading(true);
      if (action === 'accept') await deliveriesApi.accept(id);
      if (action === 'pickup') await deliveriesApi.pickup(id);
      if (action === 'complete') await deliveriesApi.complete(id);
      await loadData(); // Reload state
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update delivery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="page animate-fade-in"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>Driver Dashboard</h1>
          <p>Find new tasks or manage your active delivery.</p>
        </div>

        {activeDelivery ? (
          <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)', padding: '2rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2>Active Delivery</h2>
              <span className="badge badge-primary">{activeDelivery.status}</span>
            </div>
            
            <div className="grid grid-2" style={{ gap: '2rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pickup (Store)</h4>
                <div className="flex gap-2">
                  <StoreIcon /> 
                  <span>Store coordinates/address would be here</span>
                </div>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Drop-off (Customer)</h4>
                <div className="flex gap-2">
                  <MapPin style={{ color: 'var(--error)' }} />
                  <span>Customer address coordinates</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {activeDelivery.status === 'ASSIGNED' && (
                <button 
                  className="btn btn-accent" 
                  onClick={() => handleAction('pickup', activeDelivery.id)}
                  disabled={actionLoading}
                >
                  <Navigation size={18} /> I have picked up the order
                </button>
              )}
              {['PICKED_UP', 'IN_TRANSIT'].includes(activeDelivery.status) && (
                <button 
                  className="btn" 
                  style={{ background: 'var(--success)', color: 'white' }}
                  onClick={() => handleAction('complete', activeDelivery.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={18} /> Complete Delivery
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ marginBottom: '1.5rem' }}>Available Orders</h3>
            {deliveries.length === 0 ? (
              <div className="empty-state glass-card">
                <Truck size={64} />
                <h3>No deliveries available</h3>
                <p>Stay online, new requests will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-2">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between" style={{ marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 600 }}>Delivery #{delivery.id.slice(0, 8)}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{delivery.delivery_fee} SAR</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <StoreIcon size={16} /> Pickup from Store
                      </div>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <MapPin size={16} /> Drop-off at Customer
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary btn-block"
                      onClick={() => handleAction('accept', delivery.id)}
                      disabled={actionLoading}
                    >
                      Accept Delivery
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const StoreIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
