import { useEffect, useState } from 'react';
import { ordersApi, ratingsApi } from '../../lib/api';
import {
  Package, MapPin, Store, ChevronDown, ChevronUp, Star,
  X, AlertTriangle, CheckCircle, ShoppingBag
} from 'lucide-react';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Cancel Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Rate Modal State
  const [rateModalOrder, setRateModalOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Success Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadOrders = async () => {
    try {
      const res = await ordersApi.list();
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const openCancelModal = (order: any) => {
    setCancelModalOrder(order);
    setCancelReason('');
    setCancelError(null);
  };

  const closeCancelModal = () => {
    setCancelModalOrder(null);
    setCancelReason('');
    setCancelError(null);
    setCancelling(false);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;

    if (!cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      await ordersApi.cancel(cancelModalOrder.id, cancelReason.trim());
      showToast('Order cancelled successfully.');
      closeCancelModal();
      await loadOrders();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to cancel order.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const openRateModal = (order: any) => {
    setRateModalOrder(order);
    setRating(5);
    setHoverRating(0);
    setComment('');
    setRateError(null);
  };

  const closeRateModal = () => {
    setRateModalOrder(null);
    setRating(5);
    setHoverRating(0);
    setComment('');
    setRateError(null);
    setRatingSubmitting(false);
  };

  const handleConfirmRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModalOrder) return;

    try {
      setRatingSubmitting(true);
      setRateError(null);
      await ratingsApi.create({
        orderId: rateModalOrder.id,
        storeId: rateModalOrder.store?.id || rateModalOrder.store_id || rateModalOrder.storeId,
        rating,
        comment: comment.trim() || undefined,
      });
      showToast('Thank you! Your rating has been submitted.');
      closeRateModal();
      await loadOrders();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit rating.';
      setRateError(msg);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Awaiting Confirmation', color: 'var(--warning)', progress: 15, badgeClass: 'badge-warning' };
      case 'CONFIRMED':
        return { text: 'Order Confirmed', color: 'var(--accent)', progress: 30, badgeClass: 'badge-accent' };
      case 'PREPARING':
        return { text: 'Preparing your food', color: 'var(--primary-light)', progress: 50, badgeClass: 'badge-primary' };
      case 'READY':
      case 'READY_FOR_PICKUP':
        return { text: 'Waiting for Driver', color: 'var(--accent)', progress: 65, badgeClass: 'badge-accent' };
      case 'ASSIGNED':
      case 'PICKED_UP':
        return { text: 'Driver picked up', color: 'var(--primary-light)', progress: 75, badgeClass: 'badge-primary' };
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return { text: 'On the way', color: 'var(--accent)', progress: 90, badgeClass: 'badge-accent' };
      case 'DELIVERED':
        return { text: 'Delivered', color: 'var(--success)', progress: 100, badgeClass: 'badge-success' };
      case 'CANCELLED':
      case 'REJECTED':
        return { text: 'Cancelled', color: 'var(--error)', progress: 100, badgeClass: 'badge-error' };
      default:
        return { text: status?.replace(/_/g, ' ') || 'Unknown', color: 'var(--text-muted)', progress: 0, badgeClass: 'badge-primary' };
    }
  };

  const getStarRatingLabel = (stars: number) => {
    switch (stars) {
      case 1: return '1 Star - Poor';
      case 2: return '2 Stars - Fair';
      case 3: return '3 Stars - Good';
      case 4: return '4 Stars - Very Good';
      case 5: return '5 Stars - Excellent';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        {toastMessage && (
          <div className="toast toast-success">
            <CheckCircle size={20} />
            <span>{toastMessage}</span>
          </div>
        )}

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
            {orders.map((order) => {
              const statusInfo = getStatusDisplay(order.status);
              const orderNumber = order.order_number || order.orderNumber || order.id?.slice(0, 8);
              const orderDate = order.created_at || order.createdAt;
              const storeName = order.store?.name || order.storeName || 'Store';
              const isExpanded = !!expandedOrders[order.id];
              const itemsList = order.items || order.orderItems || [];
              const itemCount = itemsList.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
              const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';
              const canRate = order.status === 'DELIVERED';

              return (
                <div key={order.id} className="glass-card" style={{ padding: '1.5rem' }}>
                  {/* Order Top Bar */}
                  <div className="flex justify-between items-center" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Store size={24} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: 2 }}>{storeName}</h3>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          Order #{orderNumber}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)' }}>
                        {order.total} SAR
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {orderDate ? new Date(orderDate).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>

                  {/* Status Progress */}
                  <div
                    style={{
                      marginBottom: '1.25rem',
                      background: 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600, color: statusInfo.color }}>
                        {statusInfo.text}
                      </span>
                      <span className={`badge ${statusInfo.badgeClass}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${statusInfo.progress}%`,
                          background:
                            order.status === 'CANCELLED' || order.status === 'REJECTED'
                              ? 'var(--error)'
                              : 'linear-gradient(90deg, var(--primary), var(--accent))',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {(order.delivery_address || order.deliveryAddress) && (
                    <div
                      className="flex items-start gap-2"
                      style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}
                    >
                      <MapPin size={16} style={{ marginTop: 2, flexShrink: 0, color: 'var(--primary-light)' }} />
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Delivery Address</span>
                        {order.delivery_address || order.deliveryAddress}
                      </div>
                    </div>
                  )}

                  {/* Order Items Expandable Section */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: '1rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleExpand(order.id)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <ShoppingBag size={15} />
                        <span>{isExpanded ? 'Hide Items' : `View Items (${itemCount || itemsList.length})`}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {/* Action Buttons: Cancel and Rate */}
                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <button
                            className="btn btn-sm"
                            onClick={() => openCancelModal(order)}
                            style={{
                              background: 'transparent',
                              color: 'var(--error)',
                              border: '1px solid rgba(255, 82, 82, 0.4)',
                            }}
                          >
                            Cancel Order
                          </button>
                        )}

                        {canRate && (
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => openRateModal(order)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <Star size={15} style={{ fill: 'currentColor' }} />
                            <span>Rate Order</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Items List */}
                    {isExpanded && (
                      <div
                        className="animate-fade-in"
                        style={{
                          marginTop: '1rem',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                        }}
                      >
                        {itemsList.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                            Item details unavailable.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {itemsList.map((item: any, idx: number) => {
                              const itemName =
                                item.product?.name || item.product_name || item.productName || item.name || `Item #${idx + 1}`;
                              const itemQty = item.quantity || 1;
                              const unitPrice =
                                item.unit_price ?? item.unitPrice ?? item.price ?? item.price_at_add ?? 0;
                              const lineTotal =
                                item.total_price ?? item.totalPrice ?? (parseFloat(unitPrice) * itemQty).toFixed(2);
                              const imageUrl = item.product?.image_url || item.imageUrl;

                              return (
                                <div
                                  key={item.id || idx}
                                  className="flex items-center justify-between"
                                  style={{
                                    paddingBottom: '0.75rem',
                                    borderBottom: idx === itemsList.length - 1 ? 'none' : '1px solid var(--border)',
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={itemName}
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 'var(--radius-sm)',
                                          objectFit: 'cover',
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 'var(--radius-sm)',
                                          background: 'var(--bg-secondary)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        <Package size={20} />
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{itemName}</div>
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        {itemQty} × {unitPrice} SAR
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {lineTotal} SAR
                                  </div>
                                </div>
                              );
                            })}

                            <div
                              className="flex justify-between items-center"
                              style={{
                                paddingTop: '0.75rem',
                                borderTop: '1px solid var(--border)',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span>Items Subtotal</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {order.subtotal || order.total} SAR
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} style={{ color: 'var(--error)' }} />
                <h3>Cancel Order</h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={closeCancelModal}
                style={{ padding: 4, border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Are you sure you want to cancel order #{cancelModalOrder.order_number || cancelModalOrder.orderNumber || cancelModalOrder.id?.slice(0, 8)}?
              This action cannot be undone.
            </p>

            <form onSubmit={handleConfirmCancel}>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Cancellation Reason *</label>
                <textarea
                  className="input"
                  rows={3}
                  required
                  placeholder="Please let us know why you are cancelling this order..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {cancelError && (
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
                  {cancelError}
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeCancelModal}
                  disabled={cancelling}
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate Order Modal */}
      {rateModalOrder && (
        <div className="modal-overlay" onClick={closeRateModal}>
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Star size={20} style={{ color: 'var(--warning)', fill: 'currentColor' }} />
                <h3>Rate Order</h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={closeRateModal}
                style={{ padding: 4, border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              How was your experience with{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {rateModalOrder.store?.name || 'this store'}
              </strong>
              ?
            </p>

            <form onSubmit={handleConfirmRate}>
              {/* Star Rating Selector */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'inline-flex', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = (hoverRating || rating) >= starVal;
                    return (
                      <button
                        type="button"
                        key={starVal}
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          transition: 'transform 0.15s ease',
                          transform: (hoverRating || rating) >= starVal ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <Star
                          size={32}
                          style={{
                            color: isFilled ? 'var(--warning)' : 'var(--text-muted)',
                            fill: isFilled ? 'var(--warning)' : 'transparent',
                            transition: 'color 0.2s',
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)' }}>
                  {getStarRatingLabel(hoverRating || rating)}
                </div>
              </div>

              {/* Review Comment Input */}
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Comment (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Share details of your experience with the food and delivery..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {rateError && (
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
                  {rateError}
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeRateModal}
                  disabled={ratingSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={ratingSubmitting}
                >
                  {ratingSubmitting ? (
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  ) : (
                    'Submit Rating'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
