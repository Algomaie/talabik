import { useEffect, useState } from 'react';
import { deliveriesApi, ordersApi, driversApi } from '../../lib/api';
import {
  Truck, MapPin, CheckCircle, Navigation,
  Store, Wifi, WifiOff, Phone, ShoppingBag, ArrowRight,
  AlertCircle, RefreshCw
} from 'lucide-react';
import '../customer/CustomerPages.css';
import '../shared/Shared.css';

export default function DriverDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Fetch driver profile availability
      try {
        const driverRes = await driversApi.profile();
        const profile = driverRes.data?.data?.driver || driverRes.data?.data;
        setIsOnline(profile?.availability === 'ONLINE');
      } catch (err) {
        console.warn('Could not fetch driver availability:', err);
      }

      // 2. Try to fetch currently assigned / active delivery from history
      const historyRes = await deliveriesApi.history({ limit: 10 });
      const historyList = historyRes.data?.data || [];
      const active = historyList.find((d: any) =>
        ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status) ||
        ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.order?.status)
      );

      if (active) {
        // If order details or items are missing, fetch order details
        if (active.order_id && (!active.order || !active.order.items)) {
          try {
            const orderRes = await ordersApi.getById(active.order_id);
            if (orderRes.data?.data) {
              active.order = { ...active.order, ...orderRes.data.data };
            }
          } catch {
            // Keep existing active object if order getById fails
          }
        }
        setActiveDelivery(active);
        setDeliveries([]);
      } else {
        setActiveDelivery(null);
        // 3. Fetch available deliveries
        const res = await deliveriesApi.available();
        setDeliveries(res.data?.data || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      setErrorMsg(null);
      const newStatus = isOnline ? 'OFFLINE' : 'ONLINE';
      await driversApi.setAvailability(newStatus);
      setIsOnline(newStatus === 'ONLINE');

      if (newStatus === 'ONLINE') {
        const res = await deliveriesApi.available();
        setDeliveries(res.data?.data || []);
      } else {
        setDeliveries([]);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deliveriesApi.accept(deliveryId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to accept delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deliveriesApi.pickup(deliveryId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to confirm pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOutForDelivery = async (delivery: any) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deliveriesApi.startTransit(delivery.id);
      // Update local state and reload
      if (activeDelivery) {
        setActiveDelivery({
          ...activeDelivery,
          status: 'OUT_FOR_DELIVERY',
          order: {
            ...activeDelivery.order,
            status: 'OUT_FOR_DELIVERY'
          }
        });
      }
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status to Out for Delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deliveriesApi.complete(deliveryId);
      setActiveDelivery(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to complete delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Determine current active delivery step
  const getDeliveryStep = (delivery: any) => {
    const orderStatus = delivery.order?.status;
    const deliveryStatus = delivery.status;

    if (orderStatus === 'OUT_FOR_DELIVERY' || deliveryStatus === 'OUT_FOR_DELIVERY' || deliveryStatus === 'IN_TRANSIT') {
      return 'OUT_FOR_DELIVERY';
    }
    if (deliveryStatus === 'PICKED_UP' || orderStatus === 'PICKED_UP') {
      return 'PICKED_UP';
    }
    return 'ASSIGNED';
  };

  if (loading) {
    return (
      <div className="page animate-fade-in">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner" />
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading driver dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = activeDelivery ? getDeliveryStep(activeDelivery) : null;
  const storeName = activeDelivery?.store?.name || activeDelivery?.order?.store?.name || 'Partner Store';
  const storeAddress = activeDelivery?.store?.address ||
    activeDelivery?.order?.store?.address ||
    activeDelivery?.store?.address_line ||
    activeDelivery?.pickup_address ||
    'Store Location (In App)';
  const storePhone = activeDelivery?.store?.phone || activeDelivery?.order?.store?.phone;

  const dropoffAddress = activeDelivery?.dropoff_address ||
    activeDelivery?.order?.delivery_address ||
    activeDelivery?.order?.address?.addressLine ||
    activeDelivery?.order?.address?.address_line ||
    'Customer Delivery Address';
  const customerName = activeDelivery?.order?.user?.first_name
    ? `${activeDelivery.order.user.first_name} ${activeDelivery.order.user.last_name || ''}`
    : activeDelivery?.order?.customer_name || 'Customer';
  const customerPhone = activeDelivery?.order?.user?.phone || activeDelivery?.order?.customer_phone;
  const deliveryFee = activeDelivery?.delivery_fee || activeDelivery?.order?.delivery_fee || '15.00';

  return (
    <div className="page animate-fade-in">
      <div className="container">

        {/* Page Header with Online/Offline Toggle */}
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              <Truck className="text-primary" size={32} />
              Driver Deliveries
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
              Manage your active delivery assignment or accept new orders.
            </p>
          </div>

          {/* Online / Offline Toggle Switch */}
          <div className="glass-card" style={{ padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isOnline ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isOnline ? 'Receiving deliveries' : 'Not receiving tasks'}
              </div>
            </div>

            <label className="toggle-switch" style={{ cursor: availabilityLoading ? 'not-allowed' : 'pointer' }}>
              <input
                type="checkbox"
                checked={isOnline}
                disabled={availabilityLoading}
                onChange={handleToggleAvailability}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'var(--error-bg)', borderColor: 'var(--error)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)' }}>
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Offline Banner Warning */}
        {!isOnline && !activeDelivery && (
          <div className="glass-card animate-scale-in" style={{ marginBottom: '2rem', background: 'rgba(255, 183, 77, 0.08)', borderColor: 'rgba(255, 183, 77, 0.3)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                <WifiOff size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>You are currently Offline</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Switch to Online to be visible to stores and receive delivery offers.</p>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleToggleAvailability}
              disabled={availabilityLoading}
            >
              <Wifi size={16} /> Go Online Now
            </button>
          </div>
        )}

        {/* ── Active Delivery Card ── */}
        {activeDelivery ? (
          <div className="glass-card animate-scale-in" style={{ borderLeft: '4px solid var(--primary)', padding: '2rem', marginBottom: '2rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(108, 92, 231, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                  <Navigation size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Active Delivery</h2>
                    <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                      {currentStep?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Order #{activeDelivery.order?.order_number || activeDelivery.order_id?.slice(0, 8)}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                  {deliveryFee} SAR
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Driver Earning
                </div>
              </div>
            </div>

            {/* Delivery Workflow Progress Bar */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--primary-light)' }}>1. Pickup Order</span>
                <span style={{ color: currentStep === 'OUT_FOR_DELIVERY' ? 'var(--accent)' : 'var(--text-muted)' }}>
                  2. Out for Delivery
                </span>
                <span style={{ color: 'var(--text-muted)' }}>3. Delivered</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: currentStep === 'ASSIGNED' ? '33%' : currentStep === 'PICKED_UP' ? '66%' : '100%',
                    background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Store & Customer Address Information */}
            <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.75rem' }}>
              {/* Pickup Store Card */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--primary-light)', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  <Store size={18} />
                  <span>Pickup Location (Store)</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  {storeName}
                </div>
                <div className="flex items-start gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <MapPin size={16} style={{ flexShrink: 0, marginTop: '3px', color: 'var(--text-muted)' }} />
                  <span>{storeAddress}</span>
                </div>
                {storePhone && (
                  <div className="flex items-center gap-2" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Phone size={14} />
                    <a href={`tel:${storePhone}`} style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                      {storePhone}
                    </a>
                  </div>
                )}
              </div>

              {/* Drop-off Customer Card */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--accent)', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  <MapPin size={18} />
                  <span>Drop-off Location (Customer)</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  {customerName}
                </div>
                <div className="flex items-start gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <MapPin size={16} style={{ flexShrink: 0, marginTop: '3px', color: 'var(--error)' }} />
                  <span>{dropoffAddress}</span>
                </div>
                {customerPhone && (
                  <div className="flex items-center gap-2" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Phone size={14} />
                    <a href={`tel:${customerPhone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {customerPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items & Summary */}
            {activeDelivery.order?.items && activeDelivery.order.items.length > 0 && (
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.75rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <ShoppingBag size={16} />
                    <span>Order Items ({activeDelivery.order.items.length})</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    Total: {activeDelivery.order.total} SAR
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {activeDelivery.order.items.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex justify-between items-center" style={{ fontSize: '0.875rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span>
                        <strong style={{ color: 'var(--primary-light)' }}>{item.quantity}x</strong> {item.product?.name || item.name || 'Item'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.unit_price ? `${item.unit_price} SAR` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {activeDelivery.order?.notes && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--warning)' }}>
                    <strong>Customer Note:</strong> {activeDelivery.order.notes}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Step by Step */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-ghost"
                onClick={loadData}
                disabled={actionLoading}
              >
                <RefreshCw size={16} /> Refresh
              </button>

              {/* Step 1: Assigned -> Pickup */}
              {currentStep === 'ASSIGNED' && (
                <button
                  className="btn btn-accent"
                  onClick={() => handlePickup(activeDelivery.id)}
                  disabled={actionLoading}
                >
                  <Navigation size={18} /> Confirm Order Pickup
                </button>
              )}

              {/* Step 2: Picked Up -> Out for Delivery */}
              {currentStep === 'PICKED_UP' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleOutForDelivery(activeDelivery)}
                  disabled={actionLoading}
                >
                  <Truck size={18} /> Start Delivery (Out for Delivery)
                </button>
              )}

              {/* Step 3: Out for Delivery -> Complete */}
              {currentStep === 'OUT_FOR_DELIVERY' && (
                <button
                  className="btn"
                  style={{ background: 'var(--success)', color: 'white', fontWeight: 600 }}
                  onClick={() => handleComplete(activeDelivery.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={18} /> Complete Delivery
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Available Orders ── */
          <>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} className="text-primary" />
                Available Delivery Requests
                {deliveries.length > 0 && <span className="badge badge-primary">{deliveries.length}</span>}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={loadData} title="Refresh available orders">
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {deliveries.length === 0 ? (
              <div className="empty-state glass-card">
                <Truck size={64} />
                <h3>No deliveries available right now</h3>
                <p>
                  {isOnline
                    ? 'Stay online. New requests from nearby stores will appear here automatically.'
                    : 'You are currently offline. Turn on your online status to see new delivery requests.'}
                </p>
                {!isOnline && (
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleToggleAvailability} disabled={availabilityLoading}>
                    <Wifi size={16} /> Go Online
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-2">
                {deliveries.map((delivery) => {
                  const delStoreName = delivery.store?.name || delivery.order?.store?.name || 'Partner Store';
                  const delStoreAddress = delivery.store?.address || delivery.pickup_address || delivery.order?.store?.address || 'Store Location';
                  const delCustomerAddress = delivery.dropoff_address || delivery.order?.delivery_address || 'Customer Location';
                  const delFee = delivery.delivery_fee || delivery.order?.delivery_fee || '15.00';

                  return (
                    <div key={delivery.id} className="glass-card animate-scale-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                              Delivery #{delivery.id.slice(0, 8)}
                            </span>
                            {delivery.order?.order_number && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Order #{delivery.order.order_number}
                              </div>
                            )}
                          </div>
                          <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1.15rem' }}>
                            {delFee} SAR
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                          {/* Store pickup */}
                          <div className="flex items-start gap-2">
                            <Store size={18} style={{ color: 'var(--primary-light)', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup Store</div>
                              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{delStoreName}</div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{delStoreAddress}</div>
                            </div>
                          </div>

                          {/* Customer dropoff */}
                          <div className="flex items-start gap-2">
                            <MapPin size={18} style={{ color: 'var(--error)', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drop-off Location</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{delCustomerAddress}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-block"
                        onClick={() => handleAcceptDelivery(delivery.id)}
                        disabled={actionLoading}
                      >
                        Accept Delivery Request <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
