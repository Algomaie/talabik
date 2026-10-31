import { useI18n } from '../../i18n/I18nContext';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi, addressesApi, ordersApi, deliveriesApi, storesApi } from '../../lib/api';
import {
  User, Mail, Phone, Shield, Edit2, Plus, MapPin, Check,
  Trash2, Package, Lock, KeyRound, AlertCircle, CheckCircle2,
  Store, Truck, DollarSign
} from 'lucide-react';
import '../shared/Shared.css';

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const { hasRole } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real statistics state
  const [stats, setStats] = useState<{
    ordersCount: number;
    deliveriesCount: number;
    earningsTotal: number;
    storesCount: number;
  }>({
    ordersCount: 0,
    deliveriesCount: 0,
    earningsTotal: 0,
    storesCount: 0,
  });

  // Edit Profile Form
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Change Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Add Address Form (matching backend: label, addressLine, city, area, isDefault)
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: '',
    addressLine: '',
    city: '',
    area: '',
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Profile & Addresses
      const [profileRes, addrRes] = await Promise.all([
        usersApi.profile(),
        addressesApi.list().catch(() => ({ data: { data: [] } })),
      ]);

      const profData = profileRes.data.data.profile;
      setProfile(profData);
      const addrList = addrRes.data.data?.addresses || addrRes.data.data || [];
      setAddresses(Array.isArray(addrList) ? addrList : []);

      setEditForm({
        first_name: profData.first_name || '',
        last_name: profData.last_name || '',
        phone: profData.phone || '',
      });

      // 2. Fetch real statistics based on user roles
      let ordersCount = 0;
      let deliveriesCount = 0;
      let earningsTotal = 0;
      let storesCount = 0;

      if (hasRole('CUSTOMER') || hasRole('MERCHANT')) {
        try {
          const ordersRes = await ordersApi.list({ limit: 1 });
          ordersCount = ordersRes.data?.pagination?.total ?? ordersRes.data?.data?.length ?? 0;
        } catch {
          // ignore stat fetch error
        }
      }

      if (hasRole('MERCHANT')) {
        try {
          const storesRes = await storesApi.myStores();
          const list = storesRes.data?.data?.stores || storesRes.data?.data || [];
          storesCount = list.length;
        } catch {
          // ignore
        }
      }

      if (hasRole('DRIVER')) {
        try {
          const earningsRes = await deliveriesApi.earnings();
          deliveriesCount = earningsRes.data?.data?.total_deliveries || 0;
          earningsTotal = earningsRes.data?.data?.total_earnings || 0;
        } catch {
          // ignore
        }
      }

      setStats({
        ordersCount,
        deliveriesCount,
        earningsTotal,
        storesCount,
      });
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      await usersApi.updateProfile(editForm);
      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err: any) {
      alert(t(err.response?.data?.error?.message || 'Failed to update profile'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    try {
      setPasswordSaving(true);
      await usersApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to change password. Please verify your current password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    try {
      setAddressSaving(true);
      await addressesApi.create({
        label: addressForm.label,
        addressLine: addressForm.addressLine,
        city: addressForm.city,
        area: addressForm.area,
        isDefault: addressForm.isDefault,
      });
      setIsAddingAddress(false);
      setAddressForm({ label: '', addressLine: '', city: '', area: '', isDefault: false });
      const addrRes = await addressesApi.list();
      const list = addrRes.data.data?.addresses || addrRes.data.data || [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setAddressError(err.response?.data?.error?.message || 'Failed to create address');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await addressesApi.setDefault(id);
      const addrRes = await addressesApi.list();
      const list = addrRes.data.data?.addresses || addrRes.data.data || [];
      setAddresses(Array.isArray(list) ? list : []);
    } catch (err: any) {
      alert(t(err.response?.data?.error?.message || 'Failed to set default address'));
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this address?'))) return;
    try {
      await addressesApi.remove(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(t(err.response?.data?.error?.message || 'Failed to delete address'));
    }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'SAR' }).format(val);
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="loading-screen">
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t("Loading profile...")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page animate-fade-in">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="empty-state glass-card">
            <User size={48} />
            <h3>{t("Profile not found")}</h3>
            <p>{t("Unable to load user profile details.")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 960 }}>
        {/* Profile Header */}
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <div className="profile-header">
            <div className="profile-avatar-large">
              {getInitials(profile.first_name, profile.last_name)}
            </div>
            <div className="profile-meta">
              <h2>{profile.first_name} {profile.last_name}</h2>
              <div className="flex gap-3 items-center" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Mail size={14} /> {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} /> {profile.phone}
                  </div>
                )}
              </div>
              <div className="profile-roles">
                {profile.roles?.map((r: string) => (
                  <span key={r} className="badge badge-primary" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                    <Shield size={12} /> {r}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginInlineStart: 'auto' }}>
              <button className="btn btn-ghost" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> {t(" Edit Profile")}</button>
            </div>
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '2rem', alignItems: 'start' }}>

          {/* Left Column: Account Details & Password Change */}
          <div className="flex flex-col gap-4">

            {/* Account Details Card */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem' }}>{t("Account Details")}</h3>
              <div className="settings-section" style={{ marginBottom: 0 }}>
                <div className="settings-row">
                  <div className="settings-info">
                    <h4>{t("Member Since")}</h4>
                    <p>{new Date(profile.created_at).toLocaleDateString(locale)}</p>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-info">
                    <h4>{t("Account Status")}</h4>
                    <p className="flex items-center gap-1" style={{ color: profile.is_active ? 'var(--success)' : 'var(--error)' }}>
                      <span className={`status-dot ${profile.is_active ? 'active' : 'inactive'}`} />
                      {profile.is_active ? t("Active") : t("Inactive")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Real Statistics Section */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  {t("Platform Activity")}</h4>
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  {(hasRole('CUSTOMER') || hasRole('MERCHANT')) && (
                    <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="flex items-center gap-3">
                        <Package size={22} style={{ color: 'var(--primary-light)' }} />
                        <div>
                          <div className="stat-value" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                            {stats.ordersCount}
                          </div>
                          <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t("Total Orders")}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasRole('MERCHANT') && (
                    <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="flex items-center gap-3">
                        <Store size={22} style={{ color: 'var(--accent)' }} />
                        <div>
                          <div className="stat-value" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                            {stats.storesCount}
                          </div>
                          <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t("Managed Stores")}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasRole('DRIVER') && (
                    <>
                      <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div className="flex items-center gap-3">
                          <Truck size={22} style={{ color: 'var(--accent)' }} />
                          <div>
                            <div className="stat-value" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                              {stats.deliveriesCount}
                            </div>
                            <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {t("Total Deliveries")}</div>
                          </div>
                        </div>
                      </div>

                      <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div className="flex items-center gap-3">
                          <DollarSign size={22} style={{ color: 'var(--success)' }} />
                          <div>
                            <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                              {formatCurrency(stats.earningsTotal)}
                            </div>
                            <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {t("Total Earnings")}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="glass-card">
              <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                <KeyRound size={20} className="text-primary" />
                <h3 style={{ margin: 0 }}>{t("Change Password")}</h3>
              </div>

              {passwordSuccess && (
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{t(passwordSuccess)}</span>
                </div>
              )}

              {passwordError && (
                <div style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{t(passwordError)}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                <div className="input-group">
                  <label>{t("Current Password")}</label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t("Enter current password")}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t("New Password")}</label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t("At least 8 characters")}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t("Confirm New Password")}</label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t("Confirm new password")}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={passwordSaving}
                >
                  <Lock size={16} /> {passwordSaving ? t("Updating...") : t("Update Password")}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Saved Delivery Addresses */}
          <div className="glass-card">
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{t("Saved Addresses")}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t("Manage delivery locations for swift checkout")}</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingAddress(true)}>
                <Plus size={16} /> {t(" Add Address")}</button>
            </div>

            {addresses.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                <MapPin size={40} style={{ opacity: 0.3 }} />
                <h4>{t("No addresses saved")}</h4>
                <p style={{ fontSize: '0.85rem' }}>{t("Save your home or work address for faster delivery ordering.")}</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setIsAddingAddress(true)}>
                  <Plus size={16} /> {t(" Add Your First Address")}</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {addresses.map((address) => {
                  const label = address.label || address.name || 'Address';
                  const street = address.addressLine || address.address_line || address.address_line1 || address.street || '';
                  const area = address.area || address.state || '';
                  const city = address.city || '';
                  const isDefault = !!(address.isDefault ?? address.is_default);

                  return (
                    <div key={address.id} className={`address-card ${isDefault ? 'default' : ''}`}>
                      <div style={{ flex: 1 }}>
                        <div className="address-label">
                          <MapPin size={16} style={{ color: isDefault ? 'var(--primary)' : 'var(--text-muted)' }} />
                          <span>{t(label)}</span>
                          {isDefault && <span className="badge badge-success">{t("Default")}</span>}
                        </div>
                        <div className="address-text" style={{ marginTop: '0.35rem' }}>
                          <div>{street}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {[area, city].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1" style={{ alignItems: 'center' }}>
                        {!isDefault && (
                          <button
                            className="action-btn"
                            title={t("Set as Default")}
                            onClick={() => handleSetDefaultAddress(address.id)}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          className="action-btn danger"
                          title={t("Delete Address")}
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("Edit Profile")}</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
              <div className="grid grid-2">
                <div className="input-group">
                  <label>{t("First Name")}</label>
                  <input
                    className="input"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t("Last Name")}</label>
                  <input
                    className="input"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t("Phone Number")}</label>
                <input
                  className="input"
                  type="tel"
                  placeholder={t("e.g. +966500000000")}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)} style={{ flex: 1 }}>
                  {t("Cancel")}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={profileSaving}>
                  {profileSaving ? t("Saving...") : t("Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Address Modal (Fixed fields: label, addressLine, city, area, isDefault) */}
      {isAddingAddress && (
        <div className="modal-overlay" onClick={() => setIsAddingAddress(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("Add New Address")}</h3>
            </div>

            {addressError && (
              <div style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {t(addressError)}
              </div>
            )}

            <form onSubmit={handleAddAddress} className="flex flex-col gap-3">
              <div className="input-group">
                <label>{t("Address Label")}</label>
                <input
                  className="input"
                  placeholder={t("e.g. Home, Work, Apartment")}
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label>{t("Street Address / Address Line")}</label>
                <input
                  className="input"
                  placeholder={t("e.g. King Fahd Rd, Building 14, Apt 4")}
                  value={addressForm.addressLine}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-2">
                <div className="input-group">
                  <label>{t("City")}</label>
                  <input
                    className="input"
                    placeholder={t("e.g. Riyadh, Jeddah")}
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t("Area / District")}</label>
                  <input
                    className="input"
                    placeholder={t("e.g. Al Olaya, Al Malaz")}
                    value={addressForm.area}
                    onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="is_default" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  {t("Set as default delivery address")}</label>
              </div>

              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddingAddress(false)} style={{ flex: 1 }}>
                  {t("Cancel")}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={addressSaving}>
                  {addressSaving ? t("Saving...") : t("Save Address")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
