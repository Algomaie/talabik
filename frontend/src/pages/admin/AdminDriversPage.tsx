import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Truck, Search, Eye, Shield, ShieldOff,
  ChevronLeft, ChevronRight, X, Wifi, WifiOff
} from 'lucide-react';
import '../shared/Shared.css';

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const limit = 10;

  useEffect(() => { loadData(); }, [page, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await adminApi.drivers(params);
      setDrivers(data.data || []);
      setTotal(data.pagination?.total || data.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (driver: any) => {
    try {
      const newStatus = driver.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
      await adminApi.updateDriverStatus(driver.id, newStatus);
      setDrivers((prev) =>
        prev.map((d) => d.id === driver.id ? { ...d, status: newStatus } : d)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDrivers = search
    ? drivers.filter((d) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase())
      )
    : drivers;

  const totalPages = Math.ceil(total / limit) || 1;
  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return 'badge-success';
    if (status === 'SUSPENDED') return 'badge-error';
    return 'badge-warning';
  };

  if (loading && drivers.length === 0) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1><Truck size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Driver Management</h1>
          <p>Monitor drivers, their availability, and account statuses.</p>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input className="input" placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th>Driver</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th>Deliveries</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className="user-row-info">
                        <div className="user-row-avatar" style={{ background: 'linear-gradient(135deg, var(--warning), #E65100)' }}>
                          {getInitials(driver.first_name || '', driver.last_name || '')}
                        </div>
                        <div>
                          <div className="user-row-name">{driver.first_name} {driver.last_name}</div>
                          <div className="user-row-email">{driver.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {driver.availability === 'ONLINE' ? (
                        <span className="badge badge-success"><Wifi size={12} /> Online</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' }}><WifiOff size={12} /> Offline</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(driver.status)}`}>
                        <span className={`status-dot ${driver.status === 'APPROVED' ? 'active' : driver.status === 'SUSPENDED' ? 'inactive' : 'pending'}`} />
                        {driver.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{driver.total_deliveries || 0}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(driver.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn" title="View" onClick={() => setSelectedDriver(driver)}><Eye size={16} /></button>
                        <button
                          className={`action-btn ${driver.status === 'APPROVED' ? 'danger' : 'success'}`}
                          title={driver.status === 'APPROVED' ? 'Suspend' : 'Approve'}
                          onClick={() => toggleStatus(driver)}
                        >
                          {driver.status === 'APPROVED' ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDrivers.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <Truck size={40} /><h3>No drivers found</h3>
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

      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Driver Details</h3>
              <button className="action-btn" onClick={() => setSelectedDriver(null)}><X size={18} /></button>
            </div>
            <div className="profile-header" style={{ marginBottom: '1.5rem' }}>
              <div className="user-row-avatar" style={{ width: 56, height: 56, fontSize: '1rem', background: 'linear-gradient(135deg, var(--warning), #E65100)' }}>
                {getInitials(selectedDriver.first_name || '', selectedDriver.last_name || '')}
              </div>
              <div>
                <h4>{selectedDriver.first_name} {selectedDriver.last_name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{selectedDriver.email}</p>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-item"><label>Phone</label><span>{selectedDriver.phone || 'N/A'}</span></div>
              <div className="detail-item"><label>Status</label><span className={`badge ${statusBadge(selectedDriver.status)}`}>{selectedDriver.status}</span></div>
              <div className="detail-item"><label>Availability</label><span>{selectedDriver.availability || 'OFFLINE'}</span></div>
              <div className="detail-item"><label>Deliveries</label><span>{selectedDriver.total_deliveries || 0}</span></div>
              <div className="detail-item"><label>Vehicle</label><span>{selectedDriver.vehicle_type || 'N/A'}</span></div>
              <div className="detail-item"><label>Joined</label><span>{new Date(selectedDriver.created_at).toLocaleDateString()}</span></div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className={`btn ${selectedDriver.status === 'APPROVED' ? 'btn-danger' : 'btn-primary'} btn-block`}
                onClick={() => {
                  toggleStatus(selectedDriver);
                  setSelectedDriver({ ...selectedDriver, status: selectedDriver.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED' });
                }}
              >
                {selectedDriver.status === 'APPROVED' ? <><ShieldOff size={16} /> Suspend Driver</> : <><Shield size={16} /> Approve Driver</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
