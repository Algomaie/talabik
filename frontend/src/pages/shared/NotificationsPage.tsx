import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';
import { notificationsApi } from '../../lib/api';
import { Bell, CheckCheck, Package, Truck, ShoppingBag, AlertCircle, Info } from 'lucide-react';
import '../shared/Shared.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'ORDER': return <ShoppingBag size={18} style={{ color: 'var(--accent)' }} />;
    case 'DELIVERY': return <Truck size={18} style={{ color: 'var(--warning)' }} />;
    case 'SYSTEM': return <Info size={18} style={{ color: 'var(--primary-light)' }} />;
    case 'ALERT': return <AlertCircle size={18} style={{ color: 'var(--error)' }} />;
    default: return <Package size={18} style={{ color: 'var(--text-muted)' }} />;
  }
};

const timeAgo = (date: string, locale: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (seconds < 60) return relative.format(0, 'second');
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
  if (seconds < 86400) return relative.format(-Math.floor(seconds / 3600), 'hour');
  if (seconds < 604800) return relative.format(-Math.floor(seconds / 86400), 'day');
  return new Date(date).toLocaleDateString(locale);
};

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.list({ limit: 50 }),
        notificationsApi.unreadCount()
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.data?.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <h1>
                <Bell size={28} style={{ verticalAlign: 'middle', marginInlineEnd: 8 }} />
                {t("Notifications")}</h1>
              <p>{unreadCount > 0 ? t("You have {v0} unread notification{v1}", { v0: unreadCount, v1: unreadCount > 1 ? 's' : '' }) : t("You're all caught up!")}</p>
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost" onClick={markAllRead}>
                <CheckCheck size={16} /> {t(" Mark all read")}</button>
            )}
          </div>
        </div>

        <div className="admin-filters" style={{ marginBottom: '1.5rem' }}>
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            {t("All")}</button>
          <button className={`filter-chip ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
            {t("Unread ")}{unreadCount > 0 && <span className="badge badge-error" style={{ marginInlineStart: 4, padding: '0 6px', fontSize: '0.65rem' }}>{unreadCount}</span>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <Bell size={48} />
              <h3>{filter === 'unread' ? t("No unread notifications") : t("No notifications yet")}</h3>
              <p>{t("Notifications about your orders and deliveries will appear here.")}</p>
            </div>
          ) : (
            filtered.map((notif, idx) => (
              <div
                key={notif.id}
                className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                style={{ animationDelay: `${idx * 0.05}s`, animation: 'fadeIn 0.3s ease-out both' }}
              >
                <div className={`notification-dot ${notif.is_read ? 'read' : ''}`} />
                <div style={{ marginInlineEnd: '0.5rem', marginTop: '2px' }}>
                  {typeIcon(notif.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{t(notif.title)}</div>
                  <div className="notification-body">{t(notif.message)}</div>
                  <div className="notification-time">{timeAgo(notif.created_at, locale)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
