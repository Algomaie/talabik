import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  adminApi, ordersApi, storesApi, deliveriesApi, driversApi
} from '../../lib/api';
import { ShoppingBag, Store, Users, Truck,
  TrendingUp, DollarSign, Package, Clock, Wifi, WifiOff,
  CheckCircle, ArrowRight, Heart, Star, ChevronRight, ChefHat} from 'lucide-react';
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

  // Active view for multi-role accounts
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER'>('CUSTOMER');
  const [loading, setLoading] = useState(true);

  // Admin Data
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [adminRecentOrders, setAdminRecentOrders] = useState<any[]>([]);

  // Merchant Data
  const [merchantStore, setMerchantStore] = useState<any | null>(null);
  const [merchantOrders, setMerchantOrders] = useState<any[]>([]);
  const [merchantTodayOrders, setMerchantTodayOrders] = useState<number>(0);
  const [merchantPendingOrders, setMerchantPendingOrders] = useState<number>(0);
  const [merchantTodayRevenue, setMerchantTodayRevenue] = useState<number>(0);

  // Driver Data
  const [driverOnline, setDriverOnline] = useState<boolean>(false);
  const [driverEarnings, setDriverEarnings] = useState<{ total_earnings: number; total_deliveries: number } | null>(null);
  const [driverDeliveries, setDriverDeliveries] = useState<any[]>([]);
  const [driverTodayDeliveries, setDriverTodayDeliveries] = useState<number>(0);
  const [driverToggling, setDriverToggling] = useState<boolean>(false);

  // Customer Data
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [featuredStores, setFeaturedStores] = useState<any[]>([]);

  // Determine initial role view on load
  useEffect(() => {
    if (hasRole('ADMIN')) setActiveTab('ADMIN');
    else if (hasRole('MERCHANT')) setActiveTab('MERCHANT');
    else if (hasRole('DRIVER')) setActiveTab('DRIVER');
    else setActiveTab('CUSTOMER');
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load based on activeTab
      if (activeTab === 'ADMIN') {
        const [dashRes, ordersRes] = await Promise.all([
          adminApi.dashboard(),
          adminApi.orders({ limit: 5 }),
        ]);
        setAdminStats(dashRes.data.data.dashboard);
        setAdminRecentOrders(ordersRes.data.data || []);
      } else if (activeTab === 'MERCHANT') {
        const storesRes = await storesApi.myStores();
        const stores = storesRes.data?.data?.stores || storesRes.data?.data || [];
        if (stores.length > 0) {
          const store = stores[0];
          setMerchantStore(store);

          const ordersRes = await ordersApi.list({ limit: 20 });
          const ordersList = ordersRes.data?.data || [];
          setMerchantOrders(ordersList);

          // Calculate today's orders & pending orders
          const todayList = ordersList.filter((o: any) => isToday(o.createdAt || o.created_at));
          setMerchantTodayOrders(todayList.length);

          const pendingList = ordersList.filter((o: any) => o.status === 'PENDING');
          setMerchantPendingOrders(pendingList.length);

          const rev = todayList
            .filter((o: any) => o.status !== 'CANCELLED')
            .reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
          setMerchantTodayRevenue(rev);
        }
      } else if (activeTab === 'DRIVER') {
        const [profRes, earnRes, histRes] = await Promise.all([
          driversApi.profile().catch(() => ({ data: { data: null } })),
          deliveriesApi.earnings().catch(() => ({ data: { data: null } })),
          deliveriesApi.history({ limit: 10 }).catch(() => ({ data: { data: [] } })),
        ]);

        const profile = profRes.data?.data?.driver || profRes.data?.data;
        setDriverOnline(profile?.availability === 'ONLINE');
        setDriverEarnings(earnRes.data?.data?.earnings || null);

        const deliveriesList = histRes.data?.data || [];
        setDriverDeliveries(deliveriesList);
        const todayCount = deliveriesList.filter((d: any) =>
          isToday(d.completed_at || d.created_at)
        ).length;
        setDriverTodayDeliveries(todayCount);
      } else if (activeTab === 'CUSTOMER') {
        const [ordersRes, storesRes] = await Promise.all([
          ordersApi.list({ limit: 5 }).catch(() => ({ data: { data: [] } })),
          storesApi.list(1, 4).catch(() => ({ data: { data: [] } })),
        ]);
        setCustomerOrders(ordersRes.data?.data || []);
        setFeaturedStores(storesRes.data?.data?.stores || storesRes.data?.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDriverAvailability = async () => {
    try {
      setDriverToggling(true);
      const nextStatus = driverOnline ? 'OFFLINE' : 'ONLINE';
      await driversApi.setAvailability(nextStatus);
      setDriverOnline(nextStatus === 'ONLINE');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update availability');
    } finally {
      setDriverToggling(false);
    }
  };

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '0 SAR';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-SA', {
      style: 'currency', currency: 'SAR', minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'badge-success';
      case 'PENDING': return 'badge-warning';
      case 'CANCELLED': case 'REJECTED': return 'badge-error';
      case 'OUT_FOR_DELIVERY': case 'IN_TRANSIT': return 'badge-accent';
      default: return 'badge-primary';
    }
  };

  // Available roles for tab switcher
  const availableRoles = [
    hasRole('ADMIN') && 'ADMIN',
    hasRole('MERCHANT') && 'MERCHANT',
    hasRole('DRIVER') && 'DRIVER',
    (hasRole('CUSTOMER') || (!hasRole('ADMIN') && !hasRole('MERCHANT') && !hasRole('DRIVER'))) && 'CUSTOMER',
  ].filter(Boolean) as Array<'ADMIN' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER'>;

  return (
    <div className="page animate-fade-in">
      <div className="container">

        {/* Page Top Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>
              Welcome back, <span className="gradient-text">{user?.firstName || 'there'}</span>
            </h1>
            <p style={{ marginTop: '0.25rem' }}>
              {activeTab === 'ADMIN' && "Here's what's happening across the platform today."}
              {activeTab === 'MERCHANT' && "Manage your store orders and monitor daily performance."}
              {activeTab === 'DRIVER' && "Track your delivery shifts, earnings, and active tasks."}
              {activeTab === 'CUSTOMER' && "Explore tasty meals, track active orders, and visit your favorite stores."}
            </p>
          </div>

          {/* Role View Switcher if user has multiple roles */}
          {availableRoles.length > 1 && (
            <div className="admin-filters" style={{ alignSelf: 'center' }}>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  className={`filter-chip ${activeTab === role ? 'active' : ''}`}
                  onClick={() => setActiveTab(role)}
                >
                  {role === 'ADMIN' && 'Admin View'}
                  {role === 'MERCHANT' && 'Merchant View'}
                  {role === 'DRIVER' && 'Driver View'}
                  {role === 'CUSTOMER' && 'Customer View'}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '300px' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. ADMIN VIEW                                                  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'ADMIN' && adminStats && (
              <>
                {/* Admin Primary Stats */}
                <div className="grid grid-4 stats-grid">
                  <div className="glass-card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="stat-value">{formatCurrency(adminStats.revenue_today)}</div>
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
                        <div className="stat-value">{adminStats.orders_today}</div>
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
                        <div className="stat-value">{adminStats.online_drivers}</div>
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
                        <div className="stat-value">{adminStats.pending_orders}</div>
                        <div className="stat-label">Pending Orders</div>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(255, 183, 77, 0.12)', color: 'var(--warning)' }}>
                        <Clock size={24} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Secondary Stats */}
                <div className="grid grid-4 stats-grid" style={{ marginTop: '1.5rem' }}>
                  <div className="glass-card stat-card stat-compact">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="stat-mini-icon" />
                      <div>
                        <div className="stat-mini-value">{adminStats.total_users}</div>
                        <div className="stat-mini-label">Total Users</div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card stat-card stat-compact">
                    <div className="flex items-center gap-2">
                      <Store size={18} className="stat-mini-icon" />
                      <div>
                        <div className="stat-mini-value">{adminStats.active_stores}</div>
                        <div className="stat-mini-label">Active Stores</div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card stat-card stat-compact">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="stat-mini-icon" />
                      <div>
                        <div className="stat-mini-value">{adminStats.active_products}</div>
                        <div className="stat-mini-label">Products</div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card stat-card stat-compact">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="stat-mini-icon" />
                      <div>
                        <div className="stat-mini-value">{formatCurrency(adminStats.total_revenue)}</div>
                        <div className="stat-mini-label">Total Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Recent Orders */}
                <div className="glass-card" style={{ marginTop: '2rem' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                    <h3>Recent Platform Orders</h3>
                    <Link to="/admin/orders" className="btn btn-ghost btn-sm">
                      View All Orders <ChevronRight size={16} />
                    </Link>
                  </div>

                  {adminRecentOrders.length > 0 ? (
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
                          {adminRecentOrders.map((order: any) => (
                            <tr key={order.id}>
                              <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                              <td>
                                <span className={`badge ${getStatusBadge(order.status)}`}>
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
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. MERCHANT VIEW                                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'MERCHANT' && (
              <>
                {merchantStore ? (
                  <>
                    {/* Store Hero Banner */}
                    <div className="glass-card animate-scale-in" style={{ marginBottom: '2rem', padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.12), rgba(0, 210, 255, 0.06))', border: '1px solid rgba(108, 92, 231, 0.25)' }}>
                      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div className="flex items-center gap-4">
                          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Store size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{merchantStore.name}</h2>
                              <span className="badge badge-success">Active Store</span>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              {merchantStore.address || merchantStore.city || 'Store open for orders'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link to="/merchant/orders" className="btn btn-primary btn-sm">
                            <ShoppingBag size={16} /> Manage Orders
                          </Link>
                          <Link to="/merchant/settings" className="btn btn-ghost btn-sm">
                            Store Settings
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Merchant Stats Grid */}
                    <div className="grid grid-4 stats-grid" style={{ marginBottom: '2rem' }}>
                      <div className="glass-card stat-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="stat-value">{merchantTodayOrders}</div>
                            <div className="stat-label">Today's Orders</div>
                          </div>
                          <div className="stat-icon" style={{ background: 'rgba(0, 210, 255, 0.12)', color: 'var(--accent)' }}>
                            <ShoppingBag size={24} />
                          </div>
                        </div>
                      </div>

                      <div className="glass-card stat-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="stat-value" style={{ color: merchantPendingOrders > 0 ? 'var(--warning)' : 'inherit' }}>
                              {merchantPendingOrders}
                            </div>
                            <div className="stat-label">Pending Orders</div>
                          </div>
                          <div className="stat-icon" style={{ background: 'rgba(255, 183, 77, 0.12)', color: 'var(--warning)' }}>
                            <Clock size={24} />
                          </div>
                        </div>
                      </div>

                      <div className="glass-card stat-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="stat-value" style={{ color: 'var(--success)' }}>
                              {formatCurrency(merchantTodayRevenue)}
                            </div>
                            <div className="stat-label">Today's Revenue</div>
                          </div>
                          <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.12)', color: 'var(--success)' }}>
                            <DollarSign size={24} />
                          </div>
                        </div>
                      </div>

                      <div className="glass-card stat-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="stat-value">{merchantOrders.length}</div>
                            <div className="stat-label">Total Orders</div>
                          </div>
                          <div className="stat-icon">
                            <ChefHat size={24} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Store Orders */}
                    <div className="glass-card">
                      <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Recent Store Orders</h3>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Orders placed at {merchantStore.name}
                          </span>
                        </div>
                        <Link to="/merchant/orders" className="btn btn-ghost btn-sm">
                          View All ({merchantOrders.length}) <ChevronRight size={16} />
                        </Link>
                      </div>

                      {merchantOrders.length > 0 ? (
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Order #</th>
                                <th>Status</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Date</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {merchantOrders.slice(0, 5).map((order: any) => (
                                <tr key={order.id}>
                                  <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                                  <td>
                                    <span className={`badge ${getStatusBadge(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td>{order.items?.length || 1} items</td>
                                  <td style={{ fontWeight: 700 }}>{formatCurrency(order.total)}</td>
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {new Date(order.created_at).toLocaleString()}
                                  </td>
                                  <td>
                                    <Link to="/merchant/orders" className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                                      Manage
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-state">
                          <ShoppingBag size={48} />
                          <h3>No orders received yet</h3>
                          <p>When customers order from your store, they will appear here immediately.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="glass-card empty-state">
                    <Store size={64} />
                    <h3>No Store Configured</h3>
                    <p>Create or configure your store to start receiving customer orders.</p>
                    <Link to="/merchant/settings" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                      Set Up Your Store
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. DRIVER VIEW                                                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'DRIVER' && (
              <>
                {/* Driver Online/Offline Status Banner */}
                <div className="glass-card animate-scale-in" style={{ marginBottom: '2rem', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-lg)', background: driverOnline ? 'var(--success-bg)' : 'rgba(100, 116, 139, 0.15)', color: driverOnline ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {driverOnline ? <Wifi size={26} /> : <WifiOff size={26} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                          Status: <span style={{ color: driverOnline ? 'var(--success)' : 'var(--text-muted)' }}>{driverOnline ? 'ONLINE' : 'OFFLINE'}</span>
                        </h2>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {driverOnline
                          ? 'You are active and receiving delivery requests from nearby stores.'
                          : 'You are offline. Switch to online to receive new delivery assignments.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className={`btn ${driverOnline ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={handleToggleDriverAvailability}
                      disabled={driverToggling}
                    >
                      {driverOnline ? <WifiOff size={16} /> : <Wifi size={16} />}
                      {driverOnline ? 'Go Offline' : 'Go Online Now'}
                    </button>
                    <Link to="/driver/deliveries" className="btn btn-accent">
                      <Truck size={16} /> Open Deliveries
                    </Link>
                  </div>
                </div>

                {/* Driver Stats Grid */}
                <div className="grid grid-4 stats-grid" style={{ marginBottom: '2rem' }}>
                  <div className="glass-card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="stat-value">{driverTodayDeliveries}</div>
                        <div className="stat-label">Today's Deliveries</div>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(0, 210, 255, 0.12)', color: 'var(--accent)' }}>
                        <Truck size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="stat-value">{driverEarnings?.total_deliveries || 0}</div>
                        <div className="stat-label">Total Completed</div>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(108, 92, 231, 0.12)', color: 'var(--primary-light)' }}>
                        <CheckCircle size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>
                          {formatCurrency(driverEarnings?.total_earnings || 0)}
                        </div>
                        <div className="stat-label">Total Earnings</div>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(0, 230, 118, 0.12)', color: 'var(--success)' }}>
                        <DollarSign size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="stat-value">
                          {driverEarnings && driverEarnings.total_deliveries > 0
                            ? formatCurrency(driverEarnings.total_earnings / driverEarnings.total_deliveries)
                            : '0 SAR'}
                        </div>
                        <div className="stat-label">Avg / Delivery</div>
                      </div>
                      <div className="stat-icon">
                        <TrendingUp size={24} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Recent Deliveries */}
                <div className="glass-card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Recent Deliveries</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Completed delivery tasks and earnings
                      </span>
                    </div>
                    <Link to="/driver/history" className="btn btn-ghost btn-sm">
                      View Full History <ChevronRight size={16} />
                    </Link>
                  </div>

                  {driverDeliveries.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {driverDeliveries.slice(0, 5).map((del: any) => (
                        <div key={del.id} className="glass-card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div className="flex items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle size={20} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {del.store?.name || del.order?.store?.name || 'Partner Store'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(del.completed_at || del.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem' }}>
                              {formatCurrency(del.delivery_fee || (del.order?.total ? del.order.total * 0.15 : 15))}
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                              Completed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Truck size={48} />
                      <h3>No delivery tasks yet</h3>
                      <p>Go online in the Driver Deliveries page to accept your first order.</p>
                      <Link to="/driver/deliveries" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Browse Deliveries
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. CUSTOMER VIEW                                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'CUSTOMER' && (
              <>
                {/* Customer Hero Banner */}
                <div className="glass-card animate-scale-in" style={{ marginBottom: '2rem', padding: '2rem', background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 210, 255, 0.08))', border: '1px solid rgba(108, 92, 231, 0.3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ maxWidth: '600px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: 'rgba(108, 92, 231, 0.2)', borderRadius: 'var(--radius-full)', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      <Heart size={14} fill="var(--primary-light)" /> Fast & Fresh Delivery in Saudi Arabia
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.25 }}>
                      Craving something delicious today?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
                      Order food and groceries from your favorite local restaurants, cafes, and supermarkets delivered straight to your door.
                    </p>
                    <div className="flex gap-2">
                      <Link to="/stores" className="btn btn-primary">
                        Browse Stores <ArrowRight size={16} />
                      </Link>
                      <Link to="/my-orders" className="btn btn-ghost">
                        My Orders
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Favorite & Featured Stores Message Card */}
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
                    <div className="flex items-center gap-2">
                      <Star size={20} className="text-warning" fill="var(--warning)" />
                      <h3 style={{ margin: 0 }}>Favorite Stores & Top Picks</h3>
                    </div>
                    <Link to="/stores" className="btn btn-ghost btn-sm">
                      See All Stores <ChevronRight size={16} />
                    </Link>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    Enjoy exclusive dishes, top-rated meals, and prompt delivery from verified merchant partners.
                  </p>

                  {featuredStores.length > 0 ? (
                    <div className="grid grid-4" style={{ gap: '1rem' }}>
                      {featuredStores.map((store) => (
                        <Link
                          key={store.id}
                          to={`/stores/${store.id}`}
                          className="glass-card"
                          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, border-color 0.2s', border: '1px solid var(--border)' }}
                        >
                          <div>
                            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                              <Store size={22} />
                            </div>
                            <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700 }}>
                              {store.name}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {store.city || store.address || 'Delicious food & drinks'}
                            </p>
                          </div>
                          <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            Order Now <ChevronRight size={14} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Explore the stores catalog to find your top rated restaurants and save your favorites!
                      </p>
                    </div>
                  )}
                </div>

                {/* Customer Recent Orders */}
                <div className="glass-card">
                  <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>Your Recent Orders</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Track your past deliveries and re-order anytime
                      </span>
                    </div>
                    <Link to="/my-orders" className="btn btn-ghost btn-sm">
                      View All Orders <ChevronRight size={16} />
                    </Link>
                  </div>

                  {customerOrders.length > 0 ? (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Store</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerOrders.map((order: any) => (
                            <tr key={order.id}>
                              <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                              <td>{order.store?.name || 'Partner Store'}</td>
                              <td>
                                <span className={`badge ${getStatusBadge(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700 }}>{formatCurrency(order.total)}</td>
                              <td style={{ color: 'var(--text-muted)' }}>
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <Link to="/my-orders" className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                                  Track
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ShoppingBag size={48} />
                      <h3>No orders placed yet</h3>
                      <p>Your orders will show up here once you checkout.</p>
                      <Link to="/stores" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Browse Stores & Order Now
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
