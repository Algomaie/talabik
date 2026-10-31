import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, ordersApi, addressesApi, storesApi } from '../../lib/api';
import {
  ShoppingBag, Minus, Plus, Trash2, ArrowRight, MapPin, X, FileText} from 'lucide-react';
import './CustomerPages.css';

interface Address {
  id: string;
  label?: string;
  addressLine?: string;
  address_line1?: string;
  city: string;
  area?: string;
  isDefault?: boolean;
  is_default?: boolean;
}

export default function CartPage() {
  const checkoutPending = useRef(false);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Address creation form state
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    addressLine: '',
    city: 'Riyadh',
    area: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [cartRes, addrRes] = await Promise.all([
        cartApi.get(),
        addressesApi.list(),
      ]);

      const currentCart = cartRes.data.data.cart;
      setCart(currentCart);
      if (currentCart.storeId) {
        const storeRes = await storesApi.getById(currentCart.storeId);
        setDeliveryFee(Number(storeRes.data.data.store.deliveryFee));
      }

      const rawAddrs =
        addrRes.data?.data?.addresses ||
        (Array.isArray(addrRes.data?.data) ? addrRes.data.data : []);
      setAddresses(rawAddrs);

      if (rawAddrs.length > 0) {
        const def = rawAddrs.find((a: any) => a.isDefault || a.is_default);
        if (def) {
          setSelectedAddress(def.id);
        } else {
          setSelectedAddress(rawAddrs[0].id);
        }
      }
    } catch (err) {
      setLoadError('Unable to load checkout. Please try again.');
      console.error('Failed to load cart data', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return removeItem(itemId);
    try {
      await cartApi.updateItem(itemId, newQty);
      const cartRes = await cartApi.get();
      setCart(cartRes.data?.data?.cart || null);
    } catch (err) {
      console.error('Failed to update item quantity', err);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.removeItem(itemId);
      const cartRes = await cartApi.get();
      setCart(cartRes.data?.data?.cart || null);
    } catch (err) {
      console.error('Failed to remove item', err);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.addressLine.trim()) {
      setAddressError('Please enter street / address line.');
      return;
    }
    if (!newAddress.city.trim()) {
      setAddressError('Please enter city.');
      return;
    }

    try {
      setSavingAddress(true);
      setAddressError(null);
      const res = await addressesApi.create({
        label: newAddress.label.trim() || 'Home',
        addressLine: newAddress.addressLine.trim(),
        city: newAddress.city.trim(),
        area: newAddress.area.trim() || undefined,
        isDefault: newAddress.isDefault,
      });

      const created = res.data?.data?.address || res.data?.data;
      const createdId = created?.id;

      // Reload address list
      const addrRes = await addressesApi.list();
      const updatedAddrs =
        addrRes.data?.data?.addresses ||
        (Array.isArray(addrRes.data?.data) ? addrRes.data.data : []);
      setAddresses(updatedAddrs);

      if (createdId) {
        setSelectedAddress(createdId);
      } else if (updatedAddrs.length > 0) {
        setSelectedAddress(updatedAddrs[updatedAddrs.length - 1].id);
      }

      // Reset form
      setNewAddress({
        label: 'Home',
        addressLine: '',
        city: 'Riyadh',
        area: '',
        isDefault: false,
      });
      setShowAddAddressForm(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save address.';
      setAddressError(msg);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    if (checkoutPending.current) return;
    if (!selectedAddress) {
      alert('Please select or add a delivery address.');
      return;
    }
    try {
      checkoutPending.current = true;
      setCheckingOut(true);
      const payload = JSON.stringify({ selectedAddress, notes: orderNotes.trim(), items: cart?.items });
      if (checkoutAttempt.current?.payload !== payload) {
        checkoutAttempt.current = { payload, key: crypto.randomUUID() };
      }
      await ordersApi.create(selectedAddress, orderNotes.trim() || undefined, checkoutAttempt.current.key);
      checkoutAttempt.current = null;
      navigate('/my-orders');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Checkout failed');
    } finally {
      checkoutPending.current = false;
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)' }}>Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="page"><p role="alert">{loadError}</p><button onClick={loadData}>Retry</button></div>;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="page container animate-fade-in">
        <div className="empty-state glass-card">
          <ShoppingBag size={64} />
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything to your cart yet.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/stores')}
            style={{ marginTop: '1.5rem' }}
          >
            Browse Stores
          </button>
        </div>
      </div>
    );
  }

  const subtotal = Number(cart.subtotal);
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const orderTotal = (subtotal + deliveryFee + tax).toFixed(2);

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>Your Cart</h1>
          <p>Review your items and proceed to checkout.</p>
        </div>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="glass-card">
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Items from {cart.store?.name || 'Store'}</h3>
              <span className="badge badge-primary">{cart.items.length} items</span>
            </div>

            <div style={{ marginTop: '1rem' }}>
              {cart.items.map((item: any) => {
                const itemName = item.product?.name || item.productName || 'Product';
                const itemImg = item.productImage;
                const price = item.productPrice;
                const lineTotal = (parseFloat(price) * item.quantity).toFixed(2);

                return (
                  <div key={item.id} className="cart-item">
                    <div
                      className="cart-item-img"
                      style={{
                        backgroundImage: itemImg ? `url(${itemImg})` : 'none',
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {!itemImg && <ShoppingBag size={24} style={{ color: 'var(--text-muted)' }} />}
                    </div>

                    <div className="cart-item-details">
                      <div className="flex justify-between items-center">
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{itemName}</h4>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '0.35rem 0' }}>
                        {price} SAR <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>each</span>
                      </div>

                      <div className="flex justify-between items-center" style={{ marginTop: '0.5rem' }}>
                        <div className="qty-controls">
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            title="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ width: '28px', textAlign: 'center', fontWeight: 600 }}>
                            {item.quantity}
                          </span>
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            title="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {lineTotal} SAR
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delivery Instructions / Order Notes */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} /> Order Notes (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Leave at door, extra napkins, gate code..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Checkout Summary */}
          <div>
            <div className="glass-card" style={{ position: 'sticky', top: '100px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Order Summary</h3>

              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} SAR</span>
              </div>
              <div className="checkout-summary-row">
                <span>Delivery Fee</span>
                <span>{deliveryFee.toFixed(2)} SAR</span>
              </div>

              <div className="checkout-summary-row total">
                <span>VAT (15%)</span>
                <span>{tax.toFixed(2)} SAR</span>
              </div>
              <div className="checkout-summary-row total">
                <span>Total</span>
                <span>{orderTotal} SAR</span>
              </div>

              {/* Delivery Address Section */}
              <div style={{ margin: '1.75rem 0 1.5rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <label
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <MapPin size={16} style={{ color: 'var(--primary-light)' }} />
                    Delivery Address
                  </label>

                  {addresses.length > 0 && !showAddAddressForm && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowAddAddressForm(true)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }}
                    >
                      <Plus size={13} /> Add New
                    </button>
                  )}
                </div>

                {/* Case 1: Addresses Exist and Form is NOT open */}
                {addresses.length > 0 && !showAddAddressForm && (
                  <div>
                    <select
                      className="input"
                      value={selectedAddress}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                    >
                      {addresses.map((a) => {
                        const line = a.addressLine || a.address_line1 || '';
                        const city = a.city || '';
                        const area = a.area ? ` (${a.area})` : '';
                        const label = a.label ? `[${a.label}] ` : '';
                        return (
                          <option key={a.id} value={a.id}>
                            {label}{line}, {city}{area}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Case 2: No Addresses exist OR user clicked "Add New Address" */}
                {(addresses.length === 0 || showAddAddressForm) && (
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.5rem',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {addresses.length === 0 ? 'Add Delivery Address' : 'New Address'}
                      </h4>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowAddAddressForm(false);
                            setAddressError(null);
                          }}
                          style={{ padding: 2, border: 'none' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleCreateAddress}>
                      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem' }}>Label</label>
                        <select
                          className="input"
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          style={{ padding: '0.5rem 0.75rem' }}
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem' }}>Address Line (Street, Building) *</label>
                        <input
                          type="text"
                          className="input"
                          required
                          placeholder="e.g. King Fahd Rd, Apt 4B"
                          value={newAddress.addressLine}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                          style={{ padding: '0.5rem 0.75rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div className="input-group">
                          <label style={{ fontSize: '0.75rem' }}>City *</label>
                          <input
                            type="text"
                            className="input"
                            required
                            placeholder="e.g. Riyadh"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                            style={{ padding: '0.5rem 0.75rem' }}
                          />
                        </div>
                        <div className="input-group">
                          <label style={{ fontSize: '0.75rem' }}>Area / District</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="e.g. Al Olaya"
                            value={newAddress.area}
                            onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                            style={{ padding: '0.5rem 0.75rem' }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2" style={{ marginBottom: '1rem', marginTop: '0.25rem' }}>
                        <input
                          type="checkbox"
                          id="isDefaultCheckbox"
                          checked={newAddress.isDefault}
                          onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <label
                          htmlFor="isDefaultCheckbox"
                          style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, textTransform: 'none' }}
                        >
                          Save as default address
                        </label>
                      </div>

                      {addressError && (
                        <div
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'var(--error-bg)',
                            color: 'var(--error)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            marginBottom: '0.75rem',
                          }}
                        >
                          {addressError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-block"
                            onClick={() => {
                              setShowAddAddressForm(false);
                              setAddressError(null);
                            }}
                            disabled={savingAddress}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm btn-block"
                          disabled={savingAddress}
                        >
                          {savingAddress ? (
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          ) : (
                            'Save Address'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={handleCheckout}
                disabled={checkingOut || !selectedAddress || addresses.length === 0}
              >
                {checkingOut ? (
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    Proceed to Checkout <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
