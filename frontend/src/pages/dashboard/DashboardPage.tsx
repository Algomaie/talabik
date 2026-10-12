import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, ordersApi, storesApi } from '../../lib/api';
import {
  LayoutDashboard, ShoppingBag, Store, Users, Truck,
  TrendingUp, DollarSign, Package, Clock
} from 'lucide-react';
import './Dashboard.css';

interface DashboardStats {
  total_users: string;
  active_merchants: string;
  active_drivers: string;
  online_drivers: string;
  orders_today: string;
  pending_orders: string;
  completed_orders: string;
  delivered_today: string;
  total_revenue: string;
  revenue_today: string;
  active_stores: string;
  active_products: string;
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (hasRole('ADMIN')) {
        const { data } = await adminApi.dashboard();
        setStats(data.data.dashboard);
      }

      const ordersRes = await ordersApi.list({ limit: 5 });
      setRecentOrders(ordersRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-SA', {
      style: 'currency', currency: 'SAR', minimumFractionDigits: 0,
    }).format(num);
  };

  const statusClass = (status: string) => `status-${status.toLowerCase()}`;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>
            Welcome back, <span className="gradient-text">{user?.firstName}</span>
          </h1>
          <p>Here's what's happening with your platform today.</p>
        </div>

        {/* Admin Stats Grid */}
        {stats && hasRole('ADMIN') && (
          <div className="grid grid-4 stats-grid">
            <div className="glass-card stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-value">{formatCurrency(stats.revenue_today)}</div>
                  <div className="stat-label">Revenue Today</div>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.12)', color: 'var(--success)' }}>
                  <DollarSign size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-value">{stats.orders_today}</div>
                  <div className="stat-label">Orders Today</div>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(0, 210, 255, 0.12)', color: 'var(--accent)' }}>
                  <ShoppingBag size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-value">{stats.online_drivers}</div>
                  <div className="stat-label">Online Drivers</div>
                </div>
                <div className="stat-icon">
                  <Truck size={24} />
                </div>
              </div>
            </div>

            <div className="glass-card stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-value">{stats.pending_orders}</div>
                  <div className="stat-label">Pending Orders</div>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(255, 183, 77, 0.12)', color: 'var(--warning)' }}>
                  <Clock size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        {stats && hasRole('ADMIN') && (
          <div className="grid grid-4 stats-grid" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card stat-card stat-compact">
              <div className="flex items-center gap-2">
                <Users size={18} className="stat-mini-icon" />
                <div>
                  <div className="stat-mini-value">{stats.total_users}</div>
                  <div className="stat-mini-label">Total Users</div>
                </div>
              </div>
            </div>
            <div className="glass-card stat-card stat-compact">
              <div className="flex items-center gap-2">
                <Store size={18} className="stat-mini-icon" />
                <div>
                  <div className="stat-mini-value">{stats.active_stores}</div>
                  <div className="stat-mini-label">Active Stores</div>
                </div>
              </div>
            </div>
            <div className="glass-card stat-card stat-compact">
              <div className="flex items-center gap-2">
                <Package size={18} className="stat-mini-icon" />
                <div>
                  <div className="stat-mini-value">{stats.active_products}</div>
                  <div className="stat-mini-label">Products</div>
                </div>
              </div>
            </div>
            <div className="glass-card stat-card stat-compact">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="stat-mini-icon" />
                <div>
                  <div className="stat-mini-value">{formatCurrency(stats.total_revenue)}</div>
                  <div className="stat-mini-label">Total Revenue</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h3>Recent Orders</h3>
            <span className="badge badge-primary">{recentOrders.length} orders</span>
          </div>

          {recentOrders.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                      <td>
                        <span className={`badge badge-${order.status === 'DELIVERED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'primary'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{formatCurrency(order.total)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <ShoppingBag size={48} />
              <h3>No orders yet</h3>
              <p>Orders will appear here once they are placed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
