'use client';
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
  Navigation
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
  const [deliveryNote, setDeliveryNote] = useState('Left package at reception.');
  const [photoUrl, setPhotoUrl] = useState('/delivery-evidence.svg');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'DELIVERY_AGENT') {
          // Default to Daniel Kumar (Courier)
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'courier@parcelproof.com', password: 'password123' })
          })
            .then(r => r.json())
            .then(authData => {
              setUser(authData.user);
              loadDeliveries();
            });
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
          setSelectedOrder(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function updateStatus(newStatus: DeliveryStatus, noteText?: string) {
    if (!selectedOrder) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch(`/api/deliveries/${selectedOrder.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: noteText || `Courier updated status to ${newStatus}`,
          photoUrl: newStatus === 'DELIVERED' ? photoUrl : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed');
      setNotice(`Order ${selectedOrder.id} status updated to ${newStatus.replaceAll('_', ' ')}.`);
      setIsMarkingDelivered(false);
      loadDeliveries();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div suppressHydrationWarning className="portal-shell">
      {/* HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="portal-brand">
          <div suppressHydrationWarning className="brand-badge" style={{ background: '#00688c' }}>
            <Truck size={20} color="#fff" />
          </div>
          <div suppressHydrationWarning>
            <h1 style={{ fontSize: 'var(--lg)', margin: 0 }}>ParcelProof</h1>
            <span style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)' }}>Courier Dispatch & Delivery Terminal</span>
          </div>
        </div>

        <div suppressHydrationWarning className="portal-user">
          <div suppressHydrationWarning className="user-pill">
            <User size={16} className="text-accent" />
            <span>Delivery Agent: <strong>{user?.name || 'Daniel Kumar'}</strong></span>
            <span className="badge success">On Duty</span>
          </div>
          <button onClick={handleLogout} className="button secondary small">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* NOTICE */}
      {notice && (
        <div suppressHydrationWarning className="message success" style={{ margin: 'var(--s4) var(--s8)' }}>
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {loading ? (
        <div suppressHydrationWarning className="loading" style={{ margin: 'var(--s12) auto' }}>
          <RotateCw className="spin" size={24} /> Loading assigned route…
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-main">
          <div suppressHydrationWarning className="portal-grid">
            {/* ASSIGNED QUEUE */}
            <section suppressHydrationWarning className="portal-card portal-column">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>My Assigned Deliveries</h2>
                  <p>Active route orders requiring pickup and delivery proof.</p>
                </div>
                <span className="badge neutral">{deliveries.length} Assigned</span>
              </div>

              {deliveries.length === 0 ? (
                <div suppressHydrationWarning className="empty-state">
                  <Truck size={32} />
                  <p>No active delivery assignments found for your shift.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="orders-list">
                  {deliveries.map(o => (
                    <article
                      key={o.id}
                      className={`order-card ${selectedOrder?.id === o.id ? 'active' : ''}`}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <div suppressHydrationWarning className="order-meta">
                        <span className="order-id">{o.id}</span>
                        <span className="badge neutral">{o.deliveryStatus || 'ASSIGNED'}</span>
                      </div>
                      <div suppressHydrationWarning className="order-details">
                        <h3>{o.item}</h3>
                        <span className="order-amount">{o.currency} {o.amount.toFixed(2)}</span>
                      </div>
                      <div suppressHydrationWarning style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)', marginTop: 'var(--s2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {o.deliveryAddress || '404 Skyline Ave, Apt 12B, Seattle, WA'}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* ACTIVE DELIVERY WORKSPACE */}
            {selectedOrder && (
              <aside suppressHydrationWarning className="portal-sidebar">
                <div suppressHydrationWarning className="portal-card">
                  <div suppressHydrationWarning className="section-title">
                    <div>
                      <span className="eyebrow"><Navigation size={12} /> Active Dropoff Target</span>
                      <h3>{selectedOrder.id}</h3>
                    </div>
                    <span className={`badge ${selectedOrder.deliveryStatus === 'DELIVERED' ? 'success' : 'warning'}`}>
                      {selectedOrder.deliveryStatus || 'ASSIGNED'}
                    </span>
                  </div>

                  <div suppressHydrationWarning className="context-grid" style={{ margin: 'var(--s3) 0' }}>
                    <div>
                      <span>Product Item</span>
                      <strong>{selectedOrder.item}</strong>
                    </div>
                    <div>
                      <span>Customer</span>
                      <strong>{selectedOrder.speaker}</strong>
                    </div>
                    <div>
                      <span>Destination</span>
                      <small>{selectedOrder.deliveryAddress || '404 Skyline Ave, Apt 12B, Seattle, WA'}</small>
                    </div>
                    <div>
                      <span>Recipient</span>
                      <strong>{selectedOrder.recipient}</strong>
                    </div>
                  </div>

                  {/* COURIER STATE MACHINE WORKFLOW */}
                  <div suppressHydrationWarning style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                    <span style={{ fontSize: 'var(--xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Delivery Workflow Actions:
                    </span>

                    {selectedOrder.deliveryStatus !== 'PICKED_UP' && selectedOrder.deliveryStatus !== 'OUT_FOR_DELIVERY' && selectedOrder.deliveryStatus !== 'DELIVERED' && (
                      <button className="button secondary full" onClick={() => updateStatus('PICKED_UP', 'Package picked up from hub fulfillment center')} disabled={busy}>
                        <Package size={15} /> Confirm Package Picked Up
                      </button>
                    )}

                    {selectedOrder.deliveryStatus !== 'OUT_FOR_DELIVERY' && selectedOrder.deliveryStatus !== 'DELIVERED' && (
                      <button className="button primary full" onClick={() => updateStatus('OUT_FOR_DELIVERY', 'Courier en route to customer location')} disabled={busy}>
                        <Truck size={15} /> Start Out for Delivery
                      </button>
                    )}

                    {selectedOrder.deliveryStatus !== 'DELIVERED' && (
                      <>
                        <button className="button primary full" onClick={() => setIsMarkingDelivered(true)} style={{ background: '#436b1d' }}>
                          <CheckCircle2 size={15} /> Submit Delivery Proof & Complete
                        </button>
                        <button className="button secondary full" onClick={() => updateStatus('DELIVERY_ATTEMPTED', 'Attempted delivery; location inaccessible')} disabled={busy}>
                          <Clock3 size={15} /> Log Delivery Attempted
                        </button>
                      </>
                    )}

                    {selectedOrder.deliveryStatus === 'DELIVERED' && (
                      <div suppressHydrationWarning className="message success" style={{ marginTop: 'var(--s2)' }}>
                        <CheckCircle2 size={16} /> Delivery proof and statement recorded in SQLite case records.
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      )}

      {/* DELIVERED PROOF MODAL */}
      {isMarkingDelivered && selectedOrder && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsMarkingDelivered(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <div>
                <span className="eyebrow"><Camera size={12} /> Delivery Evidence Proof</span>
                <h3>Confirm Delivery · {selectedOrder.id}</h3>
              </div>
              <button className="icon-button" onClick={() => setIsMarkingDelivered(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); updateStatus('DELIVERED', deliveryNote); }}>
              <div suppressHydrationWarning className="form-group">
                <label>Courier Dropoff Statement (Evidence Record)</label>
                <textarea
                  rows={3}
                  required
                  value={deliveryNote}
                  onChange={e => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Left package at reception desk / doorstep with building manager..."
                />
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Delivery Photo Proof</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)' }}>
                  <img src={photoUrl} alt="Delivery evidence preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }} />
                  <div>
                    <strong>Simulated Courier Dropoff Upload</strong>
                    <small style={{ display: 'block', color: 'var(--text-muted)' }}>Location photo will be indexed into case RAG records.</small>
                  </div>
                </div>
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setIsMarkingDelivered(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit Delivery Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
