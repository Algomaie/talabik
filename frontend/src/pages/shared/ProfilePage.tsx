import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi, addressesApi } from '../../lib/api';
import {
  User, Mail, Phone, Shield, Edit2, Plus, MapPin, Check,
  Trash2, Package, Star
} from 'lucide-react';
import '../shared/Shared.css';

export default function ProfilePage() {
  const { user, hasRole } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Profile Form
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });

  // Add Address Form
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', street: '', city: '', state: '', zip_code: '', is_default: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, addrRes] = await Promise.all([
        usersApi.profile(),
        addressesApi.list()
      ]);
      setProfile(profileRes.data.data);
      setAddresses(addrRes.data.data || []);
      setEditForm({
        first_name: profileRes.data.data.first_name,
        last_name: profileRes.data.data.last_name,
        phone: profileRes.data.data.phone || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.updateProfile(editForm);
      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addressesApi.create(addressForm);
      setIsAddingAddress(false);
      setAddressForm({ name: '', street: '', city: '', state: '', zip_code: '', is_default: false });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await addressesApi.setDefault(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await addressesApi.remove(id);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: 900 }}>
        
        {/* Profile Header */}
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <div className="profile-header">
            <div className="profile-avatar-large">
              {getInitials(profile.first_name, profile.last_name)}
            </div>
            <div className="profile-meta">
              <h2>{profile.first_name} {profile.last_name}</h2>
              <div className="flex gap-2 items-center" style={{ marginBottom: '0.5rem' }}>
                <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Mail size={14} /> {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} /> {profile.phone}
                  </div>
                )}
              </div>
              <div className="profile-roles">
                {profile.roles.map((r: string) => (
                  <span key={r} className="badge badge-primary" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <Shield size={12} /> {r}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-ghost" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          {/* Account Details */}
          <div className="glass-card">
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <h3>Account Details</h3>
            </div>
            
            <div className="settings-section">
              <div className="settings-row">
                <div className="settings-info">
                  <h4>Member Since</h4>
                  <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-info">
                  <h4>Account Status</h4>
                  <p className="flex items-center gap-1" style={{ color: profile.is_active ? 'var(--success)' : 'var(--error)' }}>
                    <span className={`status-dot ${profile.is_active ? 'active' : 'inactive'}`} />
                    {profile.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
            
            {(hasRole('CUSTOMER') || hasRole('MERCHANT')) && (
              <div className="settings-section">
                <h3>Statistics</h3>
                <div className="grid grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                  <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex items-center gap-2">
                      <Package size={20} style={{ color: 'var(--primary-light)' }} />
                      <div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>12</div>
                        <div className="stat-label">Total Orders</div>
                      </div>
                    </div>
                  </div>
                  {hasRole('DRIVER') && (
                    <div className="stat-card" style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                      <div className="flex items-center gap-2">
                        <Star size={20} style={{ color: 'var(--warning)' }} />
                        <div>
                          <div className="stat-value" style={{ fontSize: '1.25rem' }}>4.8</div>
                          <div className="stat-label">Rating</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Addresses */}
          {hasRole('CUSTOMER') && (
            <div className="glass-card">
              <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                <h3>My Addresses</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setIsAddingAddress(true)}>
                  <Plus size={16} /> Add New
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <MapPin size={32} />
                  <h4>No addresses saved</h4>
                  <p style={{ fontSize: '0.85rem' }}>Add an address to make checkout faster.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {addresses.map((address) => (
                    <div key={address.id} className={`address-card ${address.is_default ? 'default' : ''}`}>
                      <div style={{ flex: 1 }}>
                        <div className="address-label">
                          {address.name}
                          {address.is_default && <span className="badge badge-success">Default</span>}
                        </div>
                        <div className="address-text">
                          {address.street}<br />
                          {address.city}, {address.state} {address.zip_code}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!address.is_default && (
                          <button 
                            className="action-btn" 
                            title="Set as Default"
                            onClick={() => handleSetDefaultAddress(address.id)}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button 
                          className="action-btn danger" 
                          title="Delete"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
              <div className="grid grid-2">
                <div className="input-group">
                  <label>First Name</label>
                  <input
                    className="input"
                    value={editForm.first_name}
                    onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input
                    className="input"
                    value={editForm.last_name}
                    onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input
                  className="input"
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {isAddingAddress && (
        <div className="modal-overlay" onClick={() => setIsAddingAddress(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Address</h3>
            </div>
            <form onSubmit={handleAddAddress} className="flex flex-col gap-3">
              <div className="input-group">
                <label>Address Name (e.g. Home, Work)</label>
                <input
                  className="input"
                  value={addressForm.name}
                  onChange={e => setAddressForm({...addressForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Street Address</label>
                <input
                  className="input"
                  value={addressForm.street}
                  onChange={e => setAddressForm({...addressForm, street: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="input-group">
                  <label>City</label>
                  <input
                    className="input"
                    value={addressForm.city}
                    onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>State/Region</label>
                  <input
                    className="input"
                    value={addressForm.state}
                    onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Zip Code</label>
                <input
                  className="input"
                  value={addressForm.zip_code}
                  onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})}
                />
                <label htmlFor="is_default" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Set as default address</label>
              </div>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddingAddress(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Address</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
