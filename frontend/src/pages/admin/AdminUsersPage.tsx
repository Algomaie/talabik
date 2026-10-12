import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Users, Search, Shield, ShieldOff, Eye,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import '../shared/Shared.css';

interface UserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const limit = 10;

  useEffect(() => { loadUsers(); }, [page, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (roleFilter !== 'ALL') params.role = roleFilter;
      const { data } = await adminApi.users(params);
      setUsers(data.data || []);
      setTotal(data.pagination?.total || data.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (user: UserItem) => {
    try {
      await adminApi.updateUserStatus(user.id, !user.is_active);
      setUsers((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const totalPages = Math.ceil(total / limit) || 1;
  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  if (loading && users.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>
            <Users size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            User Management
          </h1>
          <p>Manage all platform users, roles, and account statuses.</p>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input
              className="input"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filters">
            {['ALL', 'CUSTOMER', 'MERCHANT', 'DRIVER', 'ADMIN'].map((r) => (
              <button
                key={r}
                className={`filter-chip ${roleFilter === r ? 'active' : ''}`}
                onClick={() => { setRoleFilter(r); setPage(1); }}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-row-info">
                        <div className="user-row-avatar">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <div className="user-row-name">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="user-row-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {(user.roles || []).map((role) => (
                          <span
                            key={role}
                            className={`badge ${
                              role === 'ADMIN' ? 'badge-error' :
                              role === 'MERCHANT' ? 'badge-accent' :
                              role === 'DRIVER' ? 'badge-warning' : 'badge-primary'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                        <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn"
                          title="View Details"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className={`action-btn ${user.is_active ? 'danger' : 'success'}`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: '2rem' }}>
                        <Users size={40} />
                        <h3>No users found</h3>
                        <p>Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={page === p ? 'current' : ''}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="action-btn" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="profile-header" style={{ marginBottom: '1.5rem' }}>
              <div className="user-row-avatar" style={{ width: 56, height: 56, fontSize: '1rem' }}>
                {getInitials(selectedUser.first_name, selectedUser.last_name)}
              </div>
              <div>
                <h4>{selectedUser.first_name} {selectedUser.last_name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{selectedUser.email}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <label>Phone</label>
                <span>{selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`badge ${selectedUser.is_active ? 'badge-success' : 'badge-error'}`}>
                  {selectedUser.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="detail-item">
                <label>Roles</label>
                <div className="flex gap-1" style={{ flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {(selectedUser.roles || []).map((r) => (
                    <span key={r} className="badge badge-primary">{r}</span>
                  ))}
                </div>
              </div>
              <div className="detail-item">
                <label>Joined</label>
                <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                className={`btn ${selectedUser.is_active ? 'btn-danger' : 'btn-primary'} btn-block`}
                onClick={() => {
                  toggleStatus(selectedUser);
                  setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active });
                }}
              >
                {selectedUser.is_active ? (
                  <><ShieldOff size={16} /> Deactivate Account</>
                ) : (
                  <><Shield size={16} /> Activate Account</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
