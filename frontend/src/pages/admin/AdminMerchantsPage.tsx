import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Briefcase, Search, Eye, Shield, ShieldOff,
  ChevronLeft, ChevronRight, X, Store
} from 'lucide-react';
import '../shared/Shared.css';

export default function AdminMerchantsPage() {
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
      setTotal(data.pagination?.total || data.data?.length || 0);
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
          <h1><Briefcase size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Merchant Management</h1>
          <p>Manage merchant accounts and their store statuses.</p>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input className="input" placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filters">
            {['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'].map((s) => (
              <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
                {s === 'ALL' ? 'All Status' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Store</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
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
                          <div className="user-row-name">{merchant.business_name || `${merchant.first_name} ${merchant.last_name}`}</div>
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
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No store</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(merchant.status)}`}>
                        <span className={`status-dot ${merchant.status === 'APPROVED' ? 'active' : merchant.status === 'SUSPENDED' ? 'inactive' : 'pending'}`} />
                        {merchant.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(merchant.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn" title="View" onClick={() => setSelectedMerchant(merchant)}><Eye size={16} /></button>
                        <button
                          className={`action-btn ${merchant.status === 'APPROVED' ? 'danger' : 'success'}`}
                          title={merchant.status === 'APPROVED' ? 'Suspend' : 'Approve'}
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
                      <Briefcase size={40} /><h3>No merchants found</h3>
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
              <h3>Merchant Details</h3>
              <button className="action-btn" onClick={() => setSelectedMerchant(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><label>Business</label><span>{selectedMerchant.business_name || 'N/A'}</span></div>
              <div className="detail-item"><label>Email</label><span>{selectedMerchant.email}</span></div>
              <div className="detail-item"><label>Phone</label><span>{selectedMerchant.phone || 'N/A'}</span></div>
              <div className="detail-item"><label>Status</label><span className={`badge ${statusBadge(selectedMerchant.status)}`}>{selectedMerchant.status}</span></div>
              <div className="detail-item"><label>Store</label><span>{selectedMerchant.store_name || 'No store'}</span></div>
              <div className="detail-item"><label>Joined</label><span>{new Date(selectedMerchant.created_at).toLocaleDateString()}</span></div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className={`btn ${selectedMerchant.status === 'APPROVED' ? 'btn-danger' : 'btn-primary'} btn-block`}
                onClick={() => {
                  toggleStatus(selectedMerchant);
                  setSelectedMerchant({ ...selectedMerchant, status: selectedMerchant.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED' });
                }}
              >
                {selectedMerchant.status === 'APPROVED' ? <><ShieldOff size={16} /> Suspend Merchant</> : <><Shield size={16} /> Approve Merchant</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
