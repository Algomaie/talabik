import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';

import { storesApi } from '../../lib/api';
import { MapPin, Image as ImageIcon, Save, AlertCircle, Clock, DollarSign, CheckCircle } from 'lucide-react';

export default function MerchantSettingsPage() {
  const { t } = useI18n();

  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '',
    cover_url: '',
    phone: '',
    address: '',
    min_order: '',
    delivery_fee: '',
    opening_hours: '',
    is_active: false,
  });

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const { data } = await storesApi.myStores();
      const storeList = data?.data?.stores || (Array.isArray(data?.data) ? data.data : []);
      if (storeList.length > 0) {
        const s = storeList[0];
        setStore(s);

        let hours = '';
        if (s.opensAt && s.closesAt) {
          hours = `${s.opensAt} - ${s.closesAt}`;
        } else if (s.opens_at && s.closes_at) {
          hours = `${s.opens_at} - ${s.closes_at}`;
        } else if (s.opening_hours || s.openingHours) {
          hours = s.opening_hours || s.openingHours;
        }

        const minOrd = s.minOrder !== undefined ? s.minOrder : (s.min_order !== undefined ? s.min_order : '');
        const delFee = s.deliveryFee !== undefined ? s.deliveryFee : (s.delivery_fee !== undefined ? s.delivery_fee : '');

        setForm({
          name: s.name || '',
          description: s.description || '',
          logo_url: s.logoUrl || s.logo_url || '',
          cover_url: s.coverUrl || s.cover_url || '',
          phone: s.phone || '',
          address: s.address || '',
          min_order: minOrd !== '' ? String(minOrd) : '',
          delivery_fee: delFee !== '' ? String(delFee) : '',
          opening_hours: hours,
          is_active: s.isActive !== undefined ? s.isActive : (s.is_active !== undefined ? s.is_active : false),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const minOrderNum = parseFloat(form.min_order) || 0;
      const deliveryFeeNum = parseFloat(form.delivery_fee) || 0;

      const payload: Record<string, any> = {
        name: form.name.trim(),
        description: form.description,
        phone: form.phone,
        address: form.address,
        minOrder: minOrderNum,
        min_order: minOrderNum,
        deliveryFee: deliveryFeeNum,
        delivery_fee: deliveryFeeNum,
        isActive: form.is_active,
        is_active: form.is_active,
        opening_hours: form.opening_hours,
        openingHours: form.opening_hours,
      };

      if (form.logo_url) {
        payload.logoUrl = form.logo_url;
        payload.logo_url = form.logo_url;
      }
      if (form.cover_url) {
        payload.coverUrl = form.cover_url;
        payload.cover_url = form.cover_url;
      }

      // Parse opening hours into opensAt / closesAt if matching HH:mm - HH:mm
      if (form.opening_hours && form.opening_hours.trim()) {
        const match = form.opening_hours.trim().match(/^(\d{1,2}:\d{2})\s*(?:-|\/|to)\s*(\d{1,2}:\d{2})$/);
        if (match) {
          const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
          payload.opensAt = pad(match[1]);
          payload.closesAt = pad(match[2]);
          payload.opens_at = payload.opensAt;
          payload.closes_at = payload.closesAt;
        }
      }

      await storesApi.update(store.id, payload);
      setSuccessMsg('Store settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadStore();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="empty-state">
            <AlertCircle size={48} style={{ color: 'var(--warning)' }} />
            <h3>{t("No Store Found")}</h3>
            <p>{t("Your merchant account doesn't have an associated store yet. Please contact support.")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>{t("Store Settings")}</h1>
          <p>{t("Manage your store details, pricing rules, images, and availability.")}</p>
        </div>

        {successMsg && (
          <div
            className="glass-card"
            style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              borderInlineStart: '4px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--success)',
            }}
          >
            <CheckCircle size={20} />
            <span>{t(successMsg)}</span>
          </div>
        )}

        {errorMsg && (
          <div
            className="glass-card"
            style={{
              padding: '1rem',
              marginBottom: '1.5rem',
              borderInlineStart: '4px solid var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--error)',
            }}
          >
            <AlertCircle size={20} />
            <span>{t(errorMsg)}</span>
          </div>
        )}

        <div className="glass-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Header Images Preview */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <div
                style={{
                  height: 160,
                  background: form.cover_url ? `url(${form.cover_url}) center/cover` : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -30,
                  insetInlineStart: 30,
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-md)',
                  background: form.logo_url ? `url(${form.logo_url}) center/cover` : 'var(--bg-secondary)',
                  border: '4px solid var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>

            <div className="grid grid-2">
              <div className="input-group">
                <label>{t("Store Name")}</label>
                <div className="relative">
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t("Contact Phone")}</label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966500000000"
                />
              </div>
            </div>

            <div className="input-group">
              <label>{t("Description")}</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: 'vertical' }}
                placeholder={t("Describe your store and specialties")}
              />
            </div>

            <div className="input-group">
              <label>{t("Address")}</label>
              <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                <MapPin size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingInlineStart: '2.5rem' }}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("Store physical location / street address")}
                />
              </div>
            </div>

            {/* Minimum Order & Delivery Fee */}
            <div className="grid grid-2">
              <div className="input-group">
                <label>{t("Minimum Order Amount (SAR)")}</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ paddingInlineStart: '2.5rem' }}
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                    placeholder={t("e.g. 10.00")}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t("Delivery Fee (SAR)")}</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ paddingInlineStart: '2.5rem' }}
                    value={form.delivery_fee}
                    onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
                    placeholder={t("e.g. 5.00")}
                  />
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="input-group">
              <label>{t("Opening Hours")}</label>
              <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                <Clock size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type="text"
                  style={{ paddingInlineStart: '2.5rem' }}
                  value={form.opening_hours}
                  onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                  placeholder={t("e.g. 08:00 - 23:00")}
                />
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {t("Format example: 08:00 - 23:00")}</small>
            </div>

            <div className="grid grid-2" style={{ marginTop: '0.5rem' }}>
              <div className="input-group">
                <label>{t("Logo URL")}</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <ImageIcon size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingInlineStart: '2.5rem' }}
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t("Cover Image URL")}</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <ImageIcon size={18} style={{ position: 'absolute', insetInlineStart: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingInlineStart: '2.5rem' }}
                    value={form.cover_url}
                    onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                    placeholder="https://example.com/cover.png"
                  />
                </div>
              </div>
            </div>

            <div
              className="settings-row"
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div className="settings-info">
                <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>{t("Store Visibility")}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t("Allow customers to see your store and place orders.")}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="flex justify-end" style={{ marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? (
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    <Save size={18} /> {t(" Save Settings")}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
