import { useEffect, useState } from 'react';
import { ordersApi, storesApi } from '../../lib/api';
import { ShoppingBag, CheckCircle, Clock, ChefHat, Check, X } from 'lucide-react';
import '../customer/CustomerPages.css';

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch merchant's store
      const storesRes = await storesApi.myStores();
      if (storesRes.data.data.stores?.length > 0) {
        const storeId = storesRes.data.data.stores[0].id;
        setStore(storesRes.data.data.stores[0]);
        
        // Fetch orders for this store
        const ordersRes = await ordersApi.list({ limit: 50 });
        setOrders(ordersRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, action: string, status: string) => {
    try {
      setActionLoading(`${orderId}-${action}`);
      
      if (action === 'confirm') {
        await ordersApi.confirm(orderId);
      } else if (action === 'reject') {
        await ordersApi.reject(orderId, 'Store too busy');
      } else {
        await ordersApi.updateStatus(orderId, status);
      }
      
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'var(--warning)';
      case 'CONFIRMED': return 'var(--accent)';
      case 'PREPARING': return 'var(--primary-light)';
      case 'READY': return 'var(--success)';
      case 'CANCELLED': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return <div className="page animate-fade-in"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>;
  }

  if (!store) {
    return (
      <div className="page container animate-fade-in">
        <div className="empty-state glass-card">
          <h3>No Store Found</h3>
          <p>You need to create a store first to receive orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>Store Orders</h1>
          <p>Manage incoming orders for {store.name}.</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state glass-card">
            <ShoppingBag size={64} />
            <h3>No orders yet</h3>
            <p>New orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid">
            {orders.map(order => (
              <div key={order.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${getStatusColor(order.status)}` }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Order #{order.order_number}</h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}>
                      {order.status}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{order.total} SAR</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Items</h4>
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between" style={{ padding: '0.25rem 0', fontSize: '0.9rem' }}>
                      <span><span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.product?.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.unit_price} SAR</span>
                    </div>
                  ))}
                </div>

                {/* Actions based on Status */}
                <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  {order.status === 'PENDING' && (
                    <>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--error)' }}
                        onClick={() => updateStatus(order.id, 'reject', 'CANCELLED')}
                        disabled={actionLoading !== null}
                      >
                        <X size={16} /> Reject
                      </button>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => updateStatus(order.id, 'confirm', 'CONFIRMED')}
                        disabled={actionLoading !== null}
                      >
                        <Check size={16} /> Accept Order
                      </button>
                    </>
                  )}
                  
                  {order.status === 'CONFIRMED' && (
                    <button 
                      className="btn btn-accent btn-sm" 
                      onClick={() => updateStatus(order.id, 'status', 'PREPARING')}
                      disabled={actionLoading !== null}
                    >
                      <ChefHat size={16} /> Start Preparing
                    </button>
                  )}
                  
                  {order.status === 'PREPARING' && (
                    <button 
                      className="btn btn-sm" 
                      style={{ background: 'var(--success)', color: 'white' }}
                      onClick={() => updateStatus(order.id, 'status', 'READY')}
                      disabled={actionLoading !== null}
                    >
                      <CheckCircle size={16} /> Mark as Ready
                    </button>
                  )}

                  {['READY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(order.status) && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      No store actions available
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
