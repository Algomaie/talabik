import { useEffect, useState } from 'react';
import { deliveriesApi } from '../../lib/api';
import { Truck, MapPin, Clock, Calendar, ChevronRight, CheckCircle } from 'lucide-react';
import '../shared/Shared.css';

interface DeliveryHistoryItem {
  id: string;
  order_id: string;
  status: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  completed_at: string;
  created_at: string;
  store: { name: string; address: string };
  order: { total: number };
}

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [earnings, setEarnings] = useState<{ total_earnings: number; total_deliveries: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, earningsRes] = await Promise.all([
        deliveriesApi.history(),
        deliveriesApi.earnings()
      ]);
      setHistory(historyRes.data.data || []);
      setEarnings(earningsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(val);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>Delivery History & Earnings</h1>
          <p>Track your completed deliveries and total earnings.</p>
        </div>

        {/* Earnings Overview */}
        {earnings && (
          <div className="earnings-hero animate-scale-in">
            <div className="earnings-label">Total Earnings</div>
            <div className="earnings-amount">{formatCurrency(earnings.total_earnings)}</div>
            
            <div className="earnings-stats">
              <div className="earnings-stat">
                <div className="earnings-stat-value">{earnings.total_deliveries}</div>
                <div className="earnings-stat-label">Deliveries</div>
              </div>
              <div className="earnings-stat">
                <div className="earnings-stat-value">
                  {earnings.total_deliveries > 0 
                    ? formatCurrency(earnings.total_earnings / earnings.total_deliveries) 
                    : 'SAR 0'}
                </div>
                <div className="earnings-stat-label">Avg / Delivery</div>
              </div>
              <div className="earnings-stat">
                <div className="earnings-stat-value">100%</div>
                <div className="earnings-stat-label">Completion</div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} className="text-primary" /> Recent Deliveries
        </h3>

        {history.length === 0 ? (
          <div className="glass-card empty-state">
            <Truck size={48} />
            <h3>No deliveries yet</h3>
            <p>Your completed deliveries will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((delivery) => (
              <div key={delivery.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="role-icon" style={{ width: 40, height: 40 }}>
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {formatCurrency(delivery.order.total * 0.15)} {/* Mock earning calculation (15% of order) */}
                      </div>
                      <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        <Clock size={14} /> 
                        {new Date(delivery.completed_at || delivery.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success">Completed</span>
                </div>

                <div style={{ margin: '1rem 0', padding: '1rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-2" style={{ marginBottom: '0.75rem' }}>
                    <MapPin size={16} style={{ color: 'var(--primary-light)', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pickup</div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{delivery.store?.name || 'Store'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <MapPin size={16} style={{ color: 'var(--accent)', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dropoff</div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Customer Location</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.8rem' }}>
                  <span>Order #{delivery.order_id.split('-')[0]}</span>
                  <button className="flex items-center text-primary hover:text-accent transition-colors">
                    View Details <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

