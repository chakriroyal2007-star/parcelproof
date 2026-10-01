'use client';
import RoleSwitcher from '@/app/components/RoleSwitcher';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  Send, 
  LogOut, 
  RotateCw, 
  AlertTriangle,
  Clock3,
  User,
  X,
  FileText,
  Navigation,
  Inbox
} from 'lucide-react';
import type { Order, DeliveryStatus, User as UserType } from '@/lib/types';

export default function DeliveryAgentPortal() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Proof submission state
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('Left package at reception desk.');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'DELIVERY_AGENT') {
          router.push('/login');
        } else {
          setUser(d.user);
          loadDeliveries();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  function loadDeliveries() {
    setLoading(true);
    fetch('/api/deliveries')
      .then(r => r.json())
      .then(d => {
        const list: Order[] = d.deliveries || [];
        setDeliveries(list);
        if (list.length > 0) {
          setSelectedOrder(prev => {
            if (prev && list.some(o => o.id === prev.id)) {
              return list.find(o => o.id === prev.id) || list[0];
            }
            return list[0];
          });
        } else {
          setSelectedOrder(null);
        }
      })
      .catch(() => setNotice('Failed to load assigned deliveries'))
      .finally(() => setLoading(false));
  }

  async function handleUpdateStatus(newStatus: DeliveryStatus, note?: string, photo?: string) {
    if (!selectedOrder) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/deliveries/${selectedOrder.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          agentId: user?.agentId || user?.id || 'DEL-AGENT-001',
          agentName: user?.name || 'Courier',
          note: note || `Courier updated status to ${newStatus.replaceAll('_', ' ')}`,
          photoUrl: photo || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setNotice(`Order ${selectedOrder.id} status updated to ${newStatus.replaceAll('_', ' ')}.`);
      setIsMarkingDelivered(false);
      loadDeliveries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div suppressHydrationWarning className="portal-container">
      {/* HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="header-left">
          <div suppressHydrationWarning className="brand-logo">
            <Package size={22} className="brand-icon" />
            <span>Parcel<span className="brand-accent">Proof</span></span>
          </div>
          <span className="badge neutral">Courier Dispatch Portal</span>
        </div>

        <div suppressHydrationWarning className="header-right">
          <RoleSwitcher currentRole="DELIVERY_AGENT" currentName={user?.name || 'Courier'} />
          <button 
            className="button secondary small"
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'));
            }}
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {notice && (
        <div suppressHydrationWarning className="notice-banner">
          <span>{notice}</span>
          <button onClick={() => setNotice('')}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="portal-loading">
          <RotateCw size={24} className="spin" />
          <p>Loading assigned deliveries...</p>
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-content">
          <div suppressHydrationWarning className="portal-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <h2>Courier Workspace: {user?.name || 'Courier Agent'}</h2>
              <p style={{ color: 'var(--text-muted)' }}>Courier ID: <strong>{user?.agentId || user?.id || 'Active'}</strong> · Email: {user?.email}</p>
            </div>
            <button className="button secondary" onClick={loadDeliveries}>
              <RotateCw size={14} /> Refresh Deliveries
            </button>
          </div>

          {deliveries.length === 0 ? (
            <div suppressHydrationWarning className="portal-card empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
              <Inbox size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
              <h3>No Deliveries Assigned</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
                When an operations owner assigns an order to your courier account, it will appear here immediately for dropoff and proof capture.
              </p>
            </div>
          ) : (
            <div suppressHydrationWarning className="two-column-layout">
              {/* ASSIGNED DELIVERIES LIST */}
              <div suppressHydrationWarning className="portal-card">
                <div suppressHydrationWarning className="section-title">
                  <h3>Assigned Packages ({deliveries.length})</h3>
                </div>
                <div suppressHydrationWarning className="orders-list">
                  {deliveries.map(o => (
                    <div
                      key={o.id}
                      className={`order-item ${selectedOrder?.id === o.id ? 'active' : ''}`}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <div suppressHydrationWarning className="order-item-header">
                        <strong>{o.id}</strong>
                        <span className={`badge ${o.deliveryStatus === 'DELIVERED' ? 'success' : 'warning'}`}>
                          {o.deliveryStatus || 'ASSIGNED'}
                        </span>
                      </div>
                      <div suppressHydrationWarning className="order-item-details">
                        <span>{o.item}</span> · <strong>${o.amount.toFixed(2)}</strong>
                      </div>
                      <small style={{ color: 'var(--text-muted)' }}>Customer: {o.speaker}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* DELIVERY ACTIONS & PROOF */}
              {selectedOrder && (
                <div suppressHydrationWarning className="portal-card">
                  <div suppressHydrationWarning className="section-title">
                    <h3>Delivery Controls · {selectedOrder.id}</h3>
                    <span className={`badge ${selectedOrder.deliveryStatus === 'DELIVERED' ? 'success' : 'warning'}`}>
                      {selectedOrder.deliveryStatus || 'ASSIGNED'}
                    </span>
                  </div>

                  <div suppressHydrationWarning className="details-grid" style={{ marginBottom: 'var(--s4)' }}>
                    <div>
                      <label>Product</label>
                      <strong>{selectedOrder.item}</strong>
                    </div>
                    <div>
                      <label>Recipient Name</label>
                      <strong>{selectedOrder.speaker}</strong>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Dropoff Address</label>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{selectedOrder.deliveryAddress || 'Standard Address'}</p>
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div suppressHydrationWarning style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                    <h4>Update Delivery State</h4>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {selectedOrder.deliveryStatus === 'ASSIGNED' && (
                        <button 
                          className="button secondary" 
                          onClick={() => handleUpdateStatus('PICKED_UP', 'Courier accepted and picked up parcel from fulfillment center.')}
                          disabled={busy}
                        >
                          <Package size={14} /> Accept & Pick Up
                        </button>
                      )}

                      {(selectedOrder.deliveryStatus === 'ASSIGNED' || selectedOrder.deliveryStatus === 'PICKED_UP') && (
                        <button 
                          className="button secondary" 
                          onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY', 'Courier is on the way to destination.')}
                          disabled={busy}
                        >
                          <Navigation size={14} /> Out For Delivery
                        </button>
                      )}

                      {selectedOrder.deliveryStatus !== 'DELIVERED' && (
                        <button 
                          className="button primary" 
                          onClick={() => setIsMarkingDelivered(true)}
                          disabled={busy}
                        >
                          <Camera size={14} /> Complete Dropoff & Upload Proof
                        </button>
                      )}

                      {selectedOrder.deliveryStatus === 'DELIVERED' && (
                        <div style={{ color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={16} /> Package Marked Delivered with Proof
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PROOF DISPLAY IF COMPLETED */}
                  {selectedOrder.deliveryProof && (
                    <div suppressHydrationWarning style={{ marginTop: 20, background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--rds-radius-md)' }}>
                      <h4>Uploaded Proof</h4>
                      <p style={{ marginTop: 4 }}>Note: &ldquo;{selectedOrder.deliveryProof.note}&rdquo;</p>
                      {selectedOrder.deliveryProof.photoUrl && (
                        <img 
                          src={selectedOrder.deliveryProof.photoUrl} 
                          alt="Proof" 
                          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--rds-radius-sm)', marginTop: 8 }} 
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* PROOF UPLOAD MODAL */}
      {isMarkingDelivered && selectedOrder && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsMarkingDelivered(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <h3>Confirm Delivery & Proof · {selectedOrder.id}</h3>
              <button className="icon-button" onClick={() => setIsMarkingDelivered(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleUpdateStatus('DELIVERED', deliveryNote, photoUrl); }}>
              <div suppressHydrationWarning className="form-group">
                <label>Courier Dropoff Note / Statement</label>
                <textarea
                  rows={2}
                  required
                  value={deliveryNote}
                  onChange={e => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Left package at reception desk / front door"
                />
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Proof Photo URL</label>
                <input
                  type="text"
                  required
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                />
                {photoUrl && (
                  <img 
                    src={photoUrl} 
                    alt="Proof preview" 
                    style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 'var(--rds-radius-sm)', marginTop: 8 }} 
                  />
                )}
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setIsMarkingDelivered(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit Proof & Deliver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
