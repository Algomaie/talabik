import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, ordersApi, addressesApi } from '../../lib/api';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, MapPin } from 'lucide-react';
import './CustomerPages.css';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cartRes, addrRes] = await Promise.all([
        cartApi.get().catch(() => ({ data: { data: null } })),
        addressesApi.list()
      ]);
      
      setCart(cartRes.data?.data || null);
      
      const addrs = addrRes.data?.data?.addresses || [];
      setAddresses(addrs);
      const def = addrs.find((a: any) => a.is_default);
      if (def) setSelectedAddress(def.id);
      else if (addrs.length > 0) setSelectedAddress(addrs[0].id);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return removeItem(itemId);
    try {
      await cartApi.updateItem(itemId, newQty);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.removeItem(itemId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) return alert('Please select an address');
    try {
      setCheckingOut(true);
      const res = await ordersApi.create(selectedAddress);
      // Navigate to order details or success
      navigate('/my-orders');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="page animate-fade-in"><div className="container"><div className="loading-screen"><div className="spinner" /></div></div></div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="page container animate-fade-in">
        <div className="empty-state glass-card">
          <ShoppingBag size={64} />
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything to your cart yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/stores')} style={{ marginTop: '1.5rem' }}>
            Browse Stores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in">
      <div className="container">
        <div className="page-header">
          <h1>Your Cart</h1>
          <p>Review your items and checkout.</p>
        </div>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="glass-card">
            <h3>Items from {cart.store?.name}</h3>
            <div style={{ marginTop: '1.5rem' }}>
              {cart.items.map((item: any) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img" style={{ backgroundImage: item.product?.image_url ? `url(${item.product.image_url})` : 'none' }} />
                  <div className="cart-item-details">
                    <div className="flex justify-between">
                      <h4 style={{ fontSize: '1.1rem' }}>{item.product?.name}</h4>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div style={{ color: 'var(--accent)', fontWeight: 600, margin: '0.5rem 0' }}>
                      {item.price_at_add} SAR
                    </div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                      <span style={{ width: '20px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Summary */}
          <div>
            <div className="glass-card" style={{ position: 'sticky', top: '100px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Order Summary</h3>
              
              <div className="checkout-summary-row">
                <span>Subtotal</span>
                <span>{cart.total_price} SAR</span>
              </div>
              <div className="checkout-summary-row">
                <span>Delivery Fee</span>
                <span>15.00 SAR</span>
              </div>
              
              <div className="checkout-summary-row total">
                <span>Total</span>
                <span>{(parseFloat(cart.total_price) + 15).toFixed(2)} SAR</span>
              </div>

              <div style={{ margin: '2rem 0 1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Delivery Address</label>
                {addresses.length > 0 ? (
                  <select 
                    className="input" 
                    value={selectedAddress} 
                    onChange={(e) => setSelectedAddress(e.target.value)}
                  >
                    {addresses.map(a => (
                      <option key={a.id} value={a.id}>{a.address_line1}, {a.city}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No addresses found</p>
                    <button className="btn btn-ghost btn-sm" onClick={() => alert('Address management coming soon')}>
                      Add Address
                    </button>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary btn-block btn-lg" 
                onClick={handleCheckout}
                disabled={checkingOut || !selectedAddress}
              >
                {checkingOut ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
                  <>Checkout <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
