import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';
import { ordersApi, storesApi } from '../../lib/api';
import { ShoppingBag, CheckCircle, ChefHat, Check, X, AlertTriangle } from 'lucide-react';
import '../customer/CustomerPages.css';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Orders' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
] as const;

export default function MerchantOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Store too busy');
  const [customReason, setCustomReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const storesRes = await storesApi.myStores();
      const storeList = storesRes.data?.data?.stores || (Array.isArray(storesRes.data?.data) ? storesRes.data.data : []);
      if (storeList.length > 0) {
        setStore(storeList[0]);

        const ordersRes = await ordersApi.list({ limit: 50 });
        setOrders(ordersRes.data?.data || []);
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
      } else {
        await ordersApi.updateStatus(orderId, status);
      }

      await loadData();
    } catch (err: any) {
      alert(t(err.response?.data?.error?.message || 'Failed to update order'));
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (order: any) => {
    setOrderToReject(order);
    setRejectionReason('Store too busy');
    setCustomReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToReject) return;

    const finalReason = rejectionReason === 'Other'
      ? customReason.trim()
      : rejectionReason;

    if (!finalReason) {
      alert(t('Please provide a rejection reason'));
      return;
    }

    try {
      setRejecting(true);
      await ordersApi.reject(orderToReject.id, finalReason);
      setIsRejectModalOpen(false);
      setOrderToReject(null);
      await loadData();
    } catch (err: any) {
      alert(t(err.response?.data?.error?.message || 'Failed to reject order'));
    } finally {
      setRejecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'var(--warning)';
      case 'CONFIRMED':
        return 'var(--accent)';
      case 'PREPARING':
        return 'var(--primary-light)';
      case 'READY':
      case 'READY_FOR_PICKUP':
        return 'var(--success)';
      case 'CANCELLED':
        return 'var(--error)';
      default:
        return 'var(--text-muted)';
    }
  };

  const formatStatusLabel = (status: string) => {
    if (status === 'READY_FOR_PICKUP') return 'READY FOR PICKUP';
    return status;
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'READY_FOR_PICKUP') {
      return order.status === 'READY_FOR_PICKUP' || order.status === 'READY';
    }
    return order.status === statusFilter;
  });

  const getFilterCount = (filterKey: string) => {
    if (filterKey === 'ALL') return orders.length;
    if (filterKey === 'READY_FOR_PICKUP') {
      return orders.filter((o) => o.status === 'READY_FOR_PICKUP' || o.status === 'READY').length;
    }
    return orders.filter((o) => o.status === filterKey).length;
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen">
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
          <h3>{t("No Store Found")}</h3>
          <p>{t("You need to create a store first to receive orders.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>{t("Store Orders")}</h1>
          <p>{t("Manage incoming orders for ")}{store.name}.</p>
        </div>

        {/* Status Filter Tabs */}
        <div
          className="category-tabs glass-card"
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            padding: '0.5rem',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {STATUS_FILTERS.map((tab) => {
            const isActive = statusFilter === tab.key;
            const count = getFilterCount(tab.key);
            return (
              <button
                key={tab.key}
                type="button"
                className={`cat-tab ${isActive ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  background: isActive ? 'rgba(108, 92, 231, 0.2)' : 'transparent',
                  color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{t(tab.label)}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    background: isActive ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state glass-card">
            <ShoppingBag size={64} />
            <h3>{t("No orders found")}</h3>
            <p>
              {statusFilter === 'ALL'
                ? t("New orders will appear here automatically.")
                : t("No orders currently matching \"{v0}\".", { v0: t(STATUS_FILTERS.find((f) => f.key === statusFilter)?.label) })}
            </p>
          </div>
        ) : (
          <div className="grid">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  borderInlineStart: `4px solid ${getStatusColor(order.status)}`,
                }}
              >
                <div
                  className="flex justify-between items-center"
                  style={{
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      {t("Order #")}{order.order_number}
                    </h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(order.created_at).toLocaleString(locale)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="badge"
                      style={{
                        background: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                      }}
                    >
                      {t(formatStatusLabel(order.status))}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                      {order.total} {t(" SAR")}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t("Items")}</h4>
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between"
                      style={{ padding: '0.25rem 0', fontSize: '0.9rem' }}
                    >
                      <span>
                        <span style={{ fontWeight: 600 }}>{item.quantity}{t("x")}</span>{' '}
                        {item.product?.name || item.product_name}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.unit_price || item.product_price} {t(" SAR")}</span>
                    </div>
                  ))}
                </div>

                {/* Actions based on Status */}
                <div
                  className="flex items-center gap-2"
                  style={{
                    justifyContent: 'flex-end',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--error)' }}
                        onClick={() => openRejectModal(order)}
                        disabled={actionLoading !== null}
                      >
                        <X size={16} /> {t(" Reject")}</button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => updateStatus(order.id, 'confirm', 'CONFIRMED')}
                        disabled={actionLoading !== null}
                      >
                        <Check size={16} /> {t(" Accept Order")}</button>
                    </>
                  )}

                  {order.status === 'CONFIRMED' && (
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={() => updateStatus(order.id, 'status', 'PREPARING')}
                      disabled={actionLoading !== null}
                    >
                      <ChefHat size={16} /> {t(" Start Preparing")}</button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--success)', color: 'white' }}
                      onClick={() => updateStatus(order.id, 'status', 'READY_FOR_PICKUP')}
                      disabled={actionLoading !== null}
                    >
                      <CheckCircle size={16} /> {t(" Mark as Ready")}</button>
                  )}

                  {['READY', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(
                    order.status
                  ) && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {t("No store actions available")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Rejection Reason Modal */}
        {isRejectModalOpen && orderToReject && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && !rejecting && setIsRejectModalOpen(false)}
          >
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div className="flex items-center gap-2" style={{ color: 'var(--error)' }}>
                  <AlertTriangle size={22} />
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {t("Reject Order #")}{orderToReject.order_number}
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => !rejecting && setIsRejectModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmReject} className="flex flex-col gap-4">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  {t("Please select or enter the reason for rejecting this order. The customer will be notified.")}</p>

                <div className="input-group">
                  <label>{t("Select Reason")}</label>
                  <select
                    className="input"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  >
                    <option value="Store too busy">{t("Store too busy")}</option>
                    <option value="Item out of stock">{t("Item out of stock")}</option>
                    <option value="Store closing soon">{t("Store closing soon")}</option>
                    <option value="Cannot fulfill special instructions">{t("Cannot fulfill special instructions")}</option>
                    <option value="Other">{t("Other (Custom Reason)")}</option>
                  </select>
                </div>

                {rejectionReason === 'Other' && (
                  <div className="input-group">
                    <label>{t("Custom Rejection Reason")}</label>
                    <textarea
                      className="input"
                      rows={3}
                      required
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder={t("Specify the reason for rejecting this order...")}
                    />
                  </div>
                )}

                <div
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsRejectModalOpen(false)}
                    disabled={rejecting}
                  >
                    {t("Cancel")}</button>
                  <button
                    type="submit"
                    className="btn btn-sm"
                    style={{ background: 'var(--error)', color: '#fff' }}
                    disabled={rejecting}
                  >
                    {rejecting ? t("Rejecting...") : t("Confirm Rejection")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
