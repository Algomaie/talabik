import { useEffect, useState } from 'react';
import { deliveriesApi, ordersApi } from '../../lib/api';
import {
  Truck, MapPin, Clock, Calendar, ChevronRight, CheckCircle,
  X, DollarSign, Store, ShoppingBag} from 'lucide-react';
import '../shared/Shared.css';

interface DeliveryHistoryItem {
  id: string;
  order_id: string;
  status: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  pickup_address?: string;
  dropoff_address?: string;
  delivery_fee?: number;
  completed_at?: string;
  created_at: string;
  store?: { name: string; address?: string; phone?: string };
  order?: {
    store?: { name: string; address?: string; phone?: string };
    id?: string;
    order_number?: string;
    total: number;
    subtotal?: number;
    delivery_fee?: number;
    delivery_address?: string;
    notes?: string;
    items?: Array<{
      id: string;
      product?: { name: string; price?: number };
      quantity: number;
      unit_price: number;
    }>;
  };
}

export default function DriverHistoryPage() {
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [earnings, setEarnings] = useState<{ total_earnings: number; total_deliveries: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryHistoryItem | null>(null);
  const [modalOrder, setModalOrder] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, earningsRes] = await Promise.all([
        deliveriesApi.history(),
        deliveriesApi.earnings(),
      ]);
      setHistory(historyRes.data.data || []);
      const totals = earningsRes.data.data.earnings;
      setEarnings({ total_earnings: Number(totals.total_earnings), total_deliveries: Number(totals.total_completed) });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (delivery: DeliveryHistoryItem) => {
    setSelectedDelivery(delivery);
    setModalOrder(delivery.order || null);

    // Fetch full order data if items aren't already included
    if (delivery.order_id && (!delivery.order || !delivery.order.items || delivery.order.items.length === 0)) {
      try {
        setModalLoading(true);
        const res = await ordersApi.getById(delivery.order_id);
        if (res.data?.data) {
          setModalOrder(res.data.data.order);
        }
      } catch (err) {
        console.warn('Could not fetch complete order details:', err);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const handleCloseDetails = () => {
    setSelectedDelivery(null);
    setModalOrder(null);
  };

  const formatCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return '0.00 SAR';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="loading-screen">
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading delivery history...</p>
          </div>
        </div>
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
                    : '0.00 SAR'}
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
          <Calendar size={20} className="text-primary" /> Completed Deliveries
        </h3>

        {history.length === 0 ? (
          <div className="glass-card empty-state">
            <Truck size={48} />
            <h3>No completed deliveries yet</h3>
            <p>Your delivery history and earnings will appear here once tasks are completed.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((delivery) => {
              const earningAmount = delivery.delivery_fee
                ? delivery.delivery_fee
                : delivery.order?.total
                ? delivery.order.total * 0.15
                : 15;
              const storeTitle = delivery.store?.name || delivery.order?.store?.name || 'Partner Store';
              const pickupAddr = delivery.store?.address || delivery.pickup_address || 'Store Location';
              const dropoffAddr = delivery.dropoff_address || delivery.order?.delivery_address || 'Customer Location';
              const orderNum = delivery.order?.order_number || delivery.order_id?.split('-')[0] || delivery.id.slice(0, 8);

              return (
                <div key={delivery.id} className="glass-card animate-scale-in" style={{ padding: '1.25rem' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="role-icon" style={{ width: 40, height: 40, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--success)' }}>
                          {formatCurrency(earningAmount)}
                        </div>
                        <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          <Clock size={14} />
                          {new Date(delivery.completed_at || delivery.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-success">
                      {delivery.status || 'Completed'}
                    </span>
                  </div>

                  <div style={{ margin: '1rem 0', padding: '1rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-2" style={{ marginBottom: '0.75rem' }}>
                      <MapPin size={16} style={{ color: 'var(--primary-light)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup Store</div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{storeTitle}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pickupAddr}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drop-off</div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{dropoffAddr}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.825rem' }}>
                    <span>Order #{orderNum}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--primary-light)', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => handleOpenDetails(delivery)}
                    >
                      View Details <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Delivery Details Modal ── */}
        {selectedDelivery && (
          <div className="modal-overlay" onClick={handleCloseDetails}>
            <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Delivery Details</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ID: {selectedDelivery.id}
                  </span>
                </div>
                <button className="action-btn" onClick={handleCloseDetails} title="Close">
                  <X size={18} />
                </button>
              </div>

              {/* Status & Earnings Header */}
              <div className="flex justify-between items-center" style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Payout</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                    {formatCurrency(
                      selectedDelivery.delivery_fee ||
                      (selectedDelivery.order?.total ? selectedDelivery.order.total * 0.15 : 15)
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                    {selectedDelivery.status || 'COMPLETED'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Order #{modalOrder?.order_number || selectedDelivery.order?.order_number || selectedDelivery.order_id?.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="detail-item">
                  <label><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Created At</label>
                  <span>{new Date(selectedDelivery.created_at).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <label><CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Completed At</label>
                  <span>
                    {selectedDelivery.completed_at
                      ? new Date(selectedDelivery.completed_at).toLocaleString()
                      : new Date(selectedDelivery.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <label><DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Order Total</label>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(modalOrder?.total || selectedDelivery.order?.total)}</span>
                </div>
                <div className="detail-item">
                  <label>Delivery Fee</label>
                  <span>{formatCurrency(modalOrder?.delivery_fee || selectedDelivery.delivery_fee || 15)}</span>
                </div>
              </div>

              {/* Route Locations */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                {/* Store Pickup */}
                <div className="flex items-start gap-2" style={{ marginBottom: '1rem' }}>
                  <Store size={18} style={{ color: 'var(--primary-light)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pickup (Store)</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {selectedDelivery.store?.name || modalOrder?.store?.name || 'Partner Store'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {selectedDelivery.store?.address || modalOrder?.store?.address || selectedDelivery.pickup_address || 'Store Location'}
                    </div>
                  </div>
                </div>

                {/* Dropoff Customer */}
                <div className="flex items-start gap-2" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <MapPin size={18} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Drop-off (Customer)</div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      {selectedDelivery.dropoff_address || modalOrder?.delivery_address || selectedDelivery.order?.delivery_address || 'Customer Location'}
                    </div>
                    {modalOrder?.user && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Customer: {modalOrder.user.first_name} {modalOrder.user.last_name || ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShoppingBag size={14} /> Order Items
                </h4>

                {modalLoading ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading order items...
                  </div>
                ) : modalOrder?.items && modalOrder.items.length > 0 ? (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
                    {modalOrder.items.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="flex justify-between items-center" style={{ padding: '0.4rem 0', borderBottom: idx !== modalOrder.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.875rem' }}>
                        <span>
                          <strong style={{ color: 'var(--primary-light)' }}>{item.quantity}x</strong> {item.product?.name || item.name || 'Order Item'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {formatCurrency(item.unit_price || item.product?.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No specific item records attached to this historical order.
                  </div>
                )}
              </div>

              {/* Customer Notes */}
              {modalOrder?.notes && (
                <div style={{ padding: '0.875rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.25rem' }}>Delivery Notes:</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{modalOrder.notes}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary" onClick={handleCloseDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
