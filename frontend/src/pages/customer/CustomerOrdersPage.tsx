import { useEffect, useState } from 'react';
import { ordersApi } from '../../lib/api';
import { Package, MapPin, Store } from 'lucide-react';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await ordersApi.list();
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'PENDING': return { text: 'Awaiting Confirmation', color: 'var(--warning)', progress: 10 };
      case 'CONFIRMED': return { text: 'Order Confirmed', color: 'var(--accent)', progress: 25 };
      case 'PREPARING': return { text: 'Preparing your food', color: 'var(--primary-light)', progress: 50 };
      case 'READY': return { text: 'Waiting for Driver', color: 'var(--success)', progress: 65 };
      case 'PICKED_UP': return { text: 'Driver picked up', color: 'var(--success)', progress: 75 };
      case 'IN_TRANSIT': return { text: 'On the way', color: 'var(--success)', progress: 90 };
      case 'DELIVERED': return { text: 'Delivered', color: 'var(--success)', progress: 100 };
      case 'CANCELLED': return { text: 'Cancelled', color: 'var(--error)', progress: 100 };
      default: return { text: status, color: 'var(--text-muted)', progress: 0 };
    }
  };

  if (loading) {
    return <div className="page animate-fade-in"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track your past and current orders.</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state glass-card">
            <Package size={64} />
            <h3>No orders found</h3>
            <p>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="grid">
            {orders.map(order => {
              const statusInfo = getStatusDisplay(order.status);
              return (
                <div key={order.id} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Store size={24} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem' }}>{order.store?.name || 'Unknown Store'}</h3>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Order #{order.order_number}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.total} SAR</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex justify-between" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600, color: statusInfo.color }}>{statusInfo.text}</span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${statusInfo.progress}%`, 
                        background: order.status === 'CANCELLED' ? 'var(--error)' : 'linear-gradient(90deg, var(--primary), var(--accent))',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.delivery_address && (
                    <div className="flex items-start gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={16} style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ color: 'var(--text-primary)' }}>Delivery to</div>
                        {order.delivery_address}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
