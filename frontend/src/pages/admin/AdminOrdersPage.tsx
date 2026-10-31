import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  ShoppingBag, Search, Eye, ChevronLeft, ChevronRight, X,
  Clock, DollarSign
} from 'lucide-react';
import '../shared/Shared.css';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'badge-warning', CONFIRMED: 'badge-accent', PREPARING: 'badge-primary',
    READY_FOR_PICKUP: 'badge-accent', ASSIGNED: 'badge-primary', PICKED_UP: 'badge-primary',
    OUT_FOR_DELIVERY: 'badge-accent', DELIVERED: 'badge-success', CANCELLED: 'badge-error',
    REJECTED: 'badge-error', FAILED: 'badge-error',
  };
  return map[status] || 'badge-primary';
};

export default function AdminOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const limit = 10;

  useEffect(() => { loadOrders(); }, [page, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await adminApi.orders(params);
      setOrders(data.data || []);
      setTotal(data.meta?.total || data.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(num);
  };

  const filteredOrders = search
    ? orders.filter((o) =>
        o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        o.user_email?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const totalPages = Math.ceil(total / limit) || 1;

  if (loading && orders.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>{t("Loading orders...")}</p>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>
            <ShoppingBag size={28} style={{ verticalAlign: 'middle', marginInlineEnd: 8 }} />
            {t("Order Management")}</h1>
          <p>{t("View and monitor all platform orders.")}</p>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input
              className="input"
              placeholder={t("Search by order # or email...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-filters" style={{ marginBottom: '1.5rem', overflowX: 'auto', display: 'flex', gap: '0.375rem' }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{ whiteSpace: 'nowrap' }}
            >
              {s === 'ALL' ? t("All") : t(s)}
            </button>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t("Order #")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Total")}</th>
                  <th>{t("Items")}</th>
                  <th>{t("Date")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{order.order_number}</td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {t(order.status)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(order.total)}</td>
                    <td>{order.item_count || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(order.created_at).toLocaleString(locale)}
                    </td>
                    <td>
                      <button className="action-btn" title={t("View")} onClick={() => setSelectedOrder(order)}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: '2rem' }}>
                        <ShoppingBag size={40} />
                        <h3>{t("No orders found")}</h3>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={page === p ? 'current' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3>{t("Order ")}{selectedOrder.order_number}</h3>
              <button className="action-btn" onClick={() => setSelectedOrder(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${statusBadge(selectedOrder.status)}`}>{t(selectedOrder.status)}</span>
            </div>

            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="detail-item">
                <label><DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t(" Total")}</label>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(selectedOrder.total)}</span>
              </div>
              <div className="detail-item">
                <label><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t(" Created")}</label>
                <span>{new Date(selectedOrder.created_at).toLocaleString(locale)}</span>
              </div>
              <div className="detail-item">
                <label>{t("Delivery Fee")}</label>
                <span>{formatCurrency(selectedOrder.delivery_fee || 0)}</span>
              </div>
              <div className="detail-item">
                <label>{t("Subtotal")}</label>
                <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t("Notes")}</div>
                <div style={{ fontSize: '0.875rem' }}>{selectedOrder.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
