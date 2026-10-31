import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Briefcase, Search, Eye, Shield, ShieldOff,
  ChevronLeft, ChevronRight, X, Store
} from 'lucide-react';
import '../shared/Shared.css';

export default function AdminMerchantsPage() {
  const { t, locale } = useI18n();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const limit = 10;

  useEffect(() => { loadData(); }, [page, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await adminApi.merchants(params);
      setMerchants(data.data || []);
      setTotal(data.meta?.total || data.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (merchant: any) => {
    try {
      const newStatus = merchant.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
      await adminApi.updateMerchantStatus(merchant.id, newStatus);
      setMerchants((prev) =>
        prev.map((m) => m.id === merchant.id ? { ...m, status: newStatus } : m)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMerchants = search
    ? merchants.filter((m) =>
        m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
      )
    : merchants;

  const totalPages = Math.ceil(total / limit) || 1;
  const getInitials = (name: string) => name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return 'badge-success';
    if (status === 'SUSPENDED') return 'badge-error';
    return 'badge-warning';
  };

  if (loading && merchants.length === 0) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1><Briefcase size={28} style={{ verticalAlign: 'middle', marginInlineEnd: 8 }} /> {t(" Merchant Management")}</h1>
          <p>{t("Manage merchant accounts and their store statuses.")}</p>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input className="input" placeholder={t("Search merchants...")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filters">
            {['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'].map((s) => (
              <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
                {s === 'ALL' ? t("All Status") : t(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t("Merchant")}</th>
                  <th>{t("Store")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Joined")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant.id}>
                    <td>
                      <div className="user-row-info">
                        <div className="user-row-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
                          {getInitials(merchant.business_name || merchant.first_name || '')}
                        </div>
                        <div>
                          <div className="user-row-name">{merchant.business_name || t("{v0} {v1}", { v0: merchant.first_name, v1: merchant.last_name })}</div>
                          <div className="user-row-email">{merchant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {merchant.store_name ? (
                        <div className="flex items-center gap-1">
                          <Store size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{merchant.store_name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t("No store")}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(merchant.status)}`}>
                        <span className={`status-dot ${merchant.status === 'APPROVED' ? 'active' : merchant.status === 'SUSPENDED' ? 'inactive' : 'pending'}`} />
                        {t(merchant.status)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(merchant.created_at).toLocaleDateString(locale)}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn" title={t("View")} onClick={() => setSelectedMerchant(merchant)}><Eye size={16} /></button>
                        <button
                          className={`action-btn ${merchant.status === 'APPROVED' ? 'danger' : 'success'}`}
                          title={merchant.status === 'APPROVED' ? t("Suspend") : t("Approve")}
                          onClick={() => toggleStatus(merchant)}
                        >
                          {merchant.status === 'APPROVED' ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMerchants.length === 0 && (
                  <tr><td colSpan={5}>
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <Briefcase size={40} /><h3>{t("No merchants found")}</h3>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={page === p ? 'current' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {selectedMerchant && (
        <div className="modal-overlay" onClick={() => setSelectedMerchant(null)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("Merchant Details")}</h3>
              <button className="action-btn" onClick={() => setSelectedMerchant(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><label>{t("Business")}</label><span>{selectedMerchant.business_name || t("N/A")}</span></div>
              <div className="detail-item"><label>{t("Email")}</label><span>{selectedMerchant.email}</span></div>
              <div className="detail-item"><label>{t("Phone")}</label><span>{selectedMerchant.phone || t("N/A")}</span></div>
              <div className="detail-item"><label>{t("Status")}</label><span className={`badge ${statusBadge(selectedMerchant.status)}`}>{t(selectedMerchant.status)}</span></div>
              <div className="detail-item"><label>{t("Store")}</label><span>{selectedMerchant.store_name || t("No store")}</span></div>
              <div className="detail-item"><label>{t("Joined")}</label><span>{new Date(selectedMerchant.created_at).toLocaleDateString(locale)}</span></div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className={`btn ${selectedMerchant.status === 'APPROVED' ? 'btn-danger' : 'btn-primary'} btn-block`}
                onClick={() => {
                  toggleStatus(selectedMerchant);
                  setSelectedMerchant({ ...selectedMerchant, status: selectedMerchant.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED' });
                }}
              >
                {selectedMerchant.status === 'APPROVED' ? <><ShieldOff size={16} /> {t(" Suspend Merchant")}</> : <><Shield size={16} /> {t(" Approve Merchant")}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
