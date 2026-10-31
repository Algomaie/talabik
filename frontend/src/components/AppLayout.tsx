import { useI18n } from '../i18n/I18nContext';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, ShoppingBag, Store, Users, Truck, 
  Settings, LogOut, Package, Bell, Menu,
  FolderOpen, Briefcase, DollarSign, ClipboardList
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { notificationsApi } from '../lib/api';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppLayout() {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading, logout, hasRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationsApi.unreadCount()
        .then((res) => setUnreadCount(res.data.data?.count || 0))
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const requiredRole = location.pathname.startsWith('/admin/') ? 'ADMIN'
    : location.pathname.startsWith('/merchant/') ? 'MERCHANT'
    : location.pathname.startsWith('/driver/') ? 'DRIVER' : null;
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const getInitials = (first: string, last: string) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="modal-overlay" onClick={closeSidebar} style={{ zIndex: 90 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Package size={28} className="gradient-text" />
          <h2>{t("Talbak")}</h2>
        </div>

        <nav className="sidebar-nav" id="main-navigation">
          <Link 
            to="/dashboard" 
            className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <LayoutDashboard size={20} />
            <span>{t("Dashboard")}</span>
          </Link>

          {/* Customer Routes */}
          {hasRole('CUSTOMER') && (
            <>
              <div className="sidebar-section">{t("Customer")}</div>
              <Link to="/stores" className={`sidebar-link ${location.pathname.startsWith('/stores') ? 'active' : ''}`} onClick={closeSidebar}>
                <Store size={20} />
                <span>{t("Stores")}</span>
              </Link>
              <Link to="/cart" className={`sidebar-link ${isActive('/cart') ? 'active' : ''}`} onClick={closeSidebar}>
                <ShoppingBag size={20} />
                <span>{t("Cart")}</span>
              </Link>
              <Link to="/my-orders" className={`sidebar-link ${isActive('/my-orders') ? 'active' : ''}`} onClick={closeSidebar}>
                <Package size={20} />
                <span>{t("My Orders")}</span>
              </Link>
            </>
          )}

          {/* Merchant Routes */}
          {hasRole('MERCHANT') && (
            <>
              <div className="sidebar-section">{t("Merchant")}</div>
              <Link to="/merchant/orders" className={`sidebar-link ${isActive('/merchant/orders') ? 'active' : ''}`} onClick={closeSidebar}>
                <ClipboardList size={20} />
                <span>{t("Store Orders")}</span>
              </Link>
              <Link to="/merchant/products" className={`sidebar-link ${isActive('/merchant/products') ? 'active' : ''}`} onClick={closeSidebar}>
                <Package size={20} />
                <span>{t("Products")}</span>
              </Link>
              <Link to="/merchant/categories" className={`sidebar-link ${isActive('/merchant/categories') ? 'active' : ''}`} onClick={closeSidebar}>
                <FolderOpen size={20} />
                <span>{t("Categories")}</span>
              </Link>
              <Link to="/merchant/settings" className={`sidebar-link ${isActive('/merchant/settings') ? 'active' : ''}`} onClick={closeSidebar}>
                <Store size={20} />
                <span>{t("Store Settings")}</span>
              </Link>
            </>
          )}

          {/* Driver Routes */}
          {hasRole('DRIVER') && (
            <>
              <div className="sidebar-section">{t("Driver")}</div>
              <Link to="/driver/deliveries" className={`sidebar-link ${isActive('/driver/deliveries') ? 'active' : ''}`} onClick={closeSidebar}>
                <Truck size={20} />
                <span>{t("Available Tasks")}</span>
              </Link>
              <Link to="/driver/history" className={`sidebar-link ${isActive('/driver/history') ? 'active' : ''}`} onClick={closeSidebar}>
                <DollarSign size={20} />
                <span>{t("History & Earnings")}</span>
              </Link>
            </>
          )}

          {/* Admin Routes */}
          {hasRole('ADMIN') && (
            <>
              <div className="sidebar-section">{t("Administration")}</div>
              <Link to="/admin/users" className={`sidebar-link ${isActive('/admin/users') ? 'active' : ''}`} onClick={closeSidebar}>
                <Users size={20} />
                <span>{t("Users")}</span>
              </Link>
              <Link to="/admin/merchants" className={`sidebar-link ${isActive('/admin/merchants') ? 'active' : ''}`} onClick={closeSidebar}>
                <Briefcase size={20} />
                <span>{t("Merchants")}</span>
              </Link>
              <Link to="/admin/drivers" className={`sidebar-link ${isActive('/admin/drivers') ? 'active' : ''}`} onClick={closeSidebar}>
                <Truck size={20} />
                <span>{t("Drivers")}</span>
              </Link>
              <Link to="/admin/orders" className={`sidebar-link ${isActive('/admin/orders') ? 'active' : ''}`} onClick={closeSidebar}>
                <ShoppingBag size={20} />
                <span>{t("Orders")}</span>
              </Link>
            </>
          )}

          <div style={{ flex: 1 }} />

          <Link to="/notifications" className={`sidebar-link ${isActive('/notifications') ? 'active' : ''}`} onClick={closeSidebar}>
            <Bell size={20} />
            <span>{t("Notifications")}</span>
            {unreadCount > 0 && (
              <span className="badge badge-error" style={{ marginInlineStart: 'auto', padding: '0.125rem 0.5rem', fontSize: '0.65rem' }}>
                {unreadCount}
              </span>
            )}
          </Link>
          <Link to="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`} onClick={closeSidebar}>
            <Settings size={20} />
            <span>{t("Settings")}</span>
          </Link>
          <button className="sidebar-link" onClick={logout} style={{ color: 'var(--error)' }}>
            <LogOut size={20} />
            <span>{t("Logout")}</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-2">
            <button className="notification-btn" aria-label={t('Menu')} aria-expanded={sidebarOpen} aria-controls="main-navigation" onClick={toggleSidebar} style={{ display: 'none' }} id="mobile-menu-btn">
              <Menu size={24} />
            </button>
            <style>{`
              @media (max-width: 768px) { #mobile-menu-btn { display: block !important; } }
            `}</style>
          </div>

          <div className="topbar-right">
            <LanguageSwitcher />
            <Link to="/notifications" className="notification-btn" style={{ textDecoration: 'none' }}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge" />}
            </Link>
            
            <Link to="/settings" style={{ textDecoration: 'none' }}>
              <div className="user-avatar" title={user?.email}>
                {getInitials(user?.firstName || '', user?.lastName || '')}
              </div>
            </Link>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
