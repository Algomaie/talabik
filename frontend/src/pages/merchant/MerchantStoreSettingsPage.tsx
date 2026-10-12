import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storesApi } from '../../lib/api';
import { Store, MapPin, Image as ImageIcon, Save, AlertCircle } from 'lucide-react';

export default function MerchantSettingsPage() {
  const { user } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '',
    cover_url: '',
    phone: '',
    address: '',
    is_active: false
  });

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const { data } = await storesApi.myStores();
      if (data.data && data.data.length > 0) {
        const s = data.data[0];
        setStore(s);
        setForm({
          name: s.name,
          description: s.description || '',
          logo_url: s.logo_url || '',
          cover_url: s.cover_url || '',
          phone: s.phone || '',
          address: s.address || '',
          is_active: s.is_active
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
    try {
      await storesApi.update(store.id, form);
      // Optional: show a success toast here
    } catch (err) {
      console.error(err);
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
            <h3>No Store Found</h3>
            <p>Your merchant account doesn't have an associated store yet. Please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>Store Settings</h1>
          <p>Manage your store details, images, and availability.</p>
        </div>

        <div className="glass-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Header Images Preview */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
              <div 
                style={{ 
                  height: 160, 
                  background: form.cover_url ? `url(${form.cover_url}) center/cover` : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)'
                }} 
              />
              <div 
                style={{
                  position: 'absolute',
                  bottom: -30,
                  left: 30,
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-md)',
                  background: form.logo_url ? `url(${form.logo_url}) center/cover` : 'var(--bg-secondary)',
                  border: '4px solid var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              />
            </div>

            <div className="grid grid-2">
              <div className="input-group">
                <label>Store Name</label>
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
                <label>Contact Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="input-group">
              <label>Address</label>
              <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: '1rem' }}>
              <div className="input-group">
                <label>Logo URL</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <ImageIcon size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Cover Image URL</label>
                <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                  <ImageIcon size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={form.cover_url}
                    onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                    placeholder="https://example.com/cover.png"
                  />
                </div>
              </div>
            </div>

            <div className="settings-row" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div className="settings-info">
                <h4>Store Visibility</h4>
                <p>Allow customers to see your store and place orders.</p>
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
                {saving ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
                  <><Save size={18} /> Save Settings</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
