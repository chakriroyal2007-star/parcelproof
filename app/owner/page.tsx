'use client';
import RoleSwitcher from '@/app/components/RoleSwitcher';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  LogOut, 
  Bot, 
  Send, 
  LockKeyhole, 
  X, 
  Sparkles,
  ClipboardList,
  Check,
  Building,
  UserCheck,
  FileCheck,
  Scale,
  DollarSign,
  Inbox
} from 'lucide-react';
import type { Order, DeliveryAgent, RefundAssessment, OwnerDecision, CaseData, User } from '@/lib/types';

export default function OwnerPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'refund-reviews' | 'deliveries' | 'audit'>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [assessment, setAssessment] = useState<RefundAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Assignment state
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Decision state
  const [decisionReason, setDecisionReason] = useState('');
  const [requiredEvidence, setRequiredEvidence] = useState('');
  const [decisionModal, setDecisionModal] = useState<'APPROVE_REFUND' | 'REJECT_REFUND' | 'REQUEST_MORE_EVIDENCE' | 'ESCALATE' | null>(null);

  // Copilot Q&A
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || (d.user.role !== 'OWNER' && d.user.role !== 'ADMIN')) {
          router.push('/login');
        } else {
          setUser(d.user);
          loadData();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (selectedOrderId) {
      loadCaseDetails(selectedOrderId);
    } else {
      setCaseData(null);
      setAssessment(null);
    }
  }, [selectedOrderId]);

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/agents/deliveries').then(r => r.json())
    ]).then(([ordersRes, agentsRes]) => {
      const orderList: Order[] = ordersRes.orders || [];
      setOrders(orderList);
      const agentList: DeliveryAgent[] = agentsRes.agents || [];
      setAgents(agentList);
      if (agentList.length > 0) {
        setSelectedAgentId(agentList[0].id);
      }
      if (orderList.length > 0) {
        setSelectedOrderId(prev => {
          if (prev && orderList.some(o => o.id === prev)) return prev;
          const disputed = orderList.find(o => o.status.includes('disputed'));
          return disputed ? disputed.id : orderList[0].id;
        });
      } else {
        setSelectedOrderId('');
        setCaseData(null);
        setAssessment(null);
      }
    }).catch(() => {
      setNotice('Failed to load operational data');
    }).finally(() => {
      setLoading(false);
    });
  }

  function loadCaseDetails(orderId: string) {
    if (!orderId) {
      setCaseData(null);
      setAssessment(null);
      return;
    }
    Promise.all([
      fetch(`/api/cases/${orderId}`).then(r => r.json()),
      fetch(`/api/cases/${orderId}/assessment`).then(r => r.json())
    ]).then(([caseRes, assessmentRes]) => {
      if (caseRes && !caseRes.error) {
        setCaseData(caseRes);
      } else {
        setCaseData(null);
      }
      if (assessmentRes && !assessmentRes.error) {
        setAssessment(assessmentRes);
      } else {
        setAssessment(null);
      }
    }).catch(() => {
      setCaseData(null);
      setAssessment(null);
    });
  }

  async function handleAssignAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningOrder || !selectedAgentId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${assigningOrder.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryAgentId: selectedAgentId,
          assignedBy: user?.name || 'Operations Lead'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');
      setNotice(`Order ${assigningOrder.id} successfully assigned.`);
      setAssigningOrder(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign agent');
    } finally {
      setBusy(false);
    }
  }

  async function handleOwnerDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!decisionModal || !selectedOrderId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${selectedOrderId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionModal,
          reason: decisionReason,
          requiredEvidence: decisionModal === 'REQUEST_MORE_EVIDENCE' ? requiredEvidence : undefined,
          ownerName: user?.name || 'Operations Lead'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save decision');
      setNotice(`Recorded decision: ${decisionModal.replaceAll('_', ' ')}`);
      setDecisionModal(null);
      setDecisionReason('');
      setRequiredEvidence('');
      loadData();
      if (selectedOrderId) {
        loadCaseDetails(selectedOrderId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Decision recording failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAskCopilot(e: React.FormEvent) {
    e.preventDefault();
    const question = copilotQuestion;
    if (!question.trim() || !selectedOrderId) return;
    setCopilotLoading(true);
    try {
      const res = await fetch(`/api/cases/${selectedOrderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const d = await res.json();
      if (d.answer) {
        setCopilotAnswer(d.answer);
      } else if (d.message) {
        setCopilotAnswer(d.message);
      } else {
        setCopilotAnswer('Analysis completed based on case context.');
      }
    } catch {
      setCopilotAnswer('Copilot is temporarily unavailable.');
    } finally {
      setCopilotLoading(false);
    }
  }

  const disputedOrders = orders.filter(o => o.status.includes('disputed'));
  const activeSelectedOrder = orders.find(o => o.id === selectedOrderId) || (orders.length > 0 ? orders[0] : null);

  return (
    <div suppressHydrationWarning className="portal-container">
      {/* TOP HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="header-left">
          <div suppressHydrationWarning className="brand-logo">
            <Package size={22} className="brand-icon" />
            <span>Parcel<span className="brand-accent">Proof</span></span>
          </div>
          <span className="badge warning">Operations Owner Workspace</span>
        </div>

        <div suppressHydrationWarning className="header-right">
          <RoleSwitcher currentRole="OWNER" currentName={user?.name || 'Operations Lead'} />
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

      {/* NAVIGATION TABS */}
      <nav suppressHydrationWarning className="portal-nav">
        <button className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
          <ClipboardList size={16} /> Operations Overview
        </button>
        <button className={`nav-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          <Package size={16} /> All Orders ({orders.length})
        </button>
        <button className={`nav-item ${tab === 'refund-reviews' ? 'active' : ''}`} onClick={() => setTab('refund-reviews')}>
          <Scale size={16} /> Dispute Reviews ({disputedOrders.length})
        </button>
        <button className={`nav-item ${tab === 'deliveries' ? 'active' : ''}`} onClick={() => setTab('deliveries')}>
          <Truck size={16} /> Couriers & Deliveries ({orders.filter(o => o.deliveryAgentId).length})
        </button>
        {caseData && (
          <button className={`nav-item ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
            <FileCheck size={16} /> Audit Trail
          </button>
        )}
      </nav>

      {notice && (
        <div suppressHydrationWarning className="notice-banner">
          <span>{notice}</span>
          <button onClick={() => setNotice('')}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="portal-loading">
          <RotateCw size={24} className="spin" />
          <p>Loading operational data...</p>
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-content">
          {/* TAB 1: DASHBOARD */}
          {tab === 'dashboard' && (
            <div suppressHydrationWarning className="dashboard-grid">
              {/* METRICS */}
              <div suppressHydrationWarning className="metrics-row">
                <div suppressHydrationWarning className="metric-card">
                  <span className="metric-label">Total Orders Placed</span>
                  <strong className="metric-value">{orders.length}</strong>
                  <small>Real-time database records</small>
                </div>
                <div suppressHydrationWarning className="metric-card warning">
                  <span className="metric-label">Active Disputes</span>
                  <strong className="metric-value">{disputedOrders.length}</strong>
                  <small>Awaiting evidence reconciliation</small>
                </div>
                <div suppressHydrationWarning className="metric-card success">
                  <span className="metric-label">Assigned Deliveries</span>
                  <strong className="metric-value">{orders.filter(o => o.deliveryAgentId).length}</strong>
                  <small>Registered couriers on route</small>
                </div>
                <div suppressHydrationWarning className="metric-card">
                  <span className="metric-label">Registered Couriers</span>
                  <strong className="metric-value">{agents.length}</strong>
                  <small>Available in dispatch pool</small>
                </div>
              </div>

              {orders.length === 0 ? (
                <div suppressHydrationWarning className="portal-card empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Inbox size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Orders Have Been Placed Yet</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto var(--s4)' }}>
                    When a customer registers and places an order from the product catalog, it will appear here in real-time for courier dispatch and dispute tracking.
                  </p>
                </div>
              ) : (
                /* TWO COLUMN LAYOUT */
                <div suppressHydrationWarning className="two-column-layout">
                  {/* ORDERS QUEUE */}
                  <div suppressHydrationWarning className="portal-card">
                    <div suppressHydrationWarning className="section-title">
                      <h3>Live Customer Orders</h3>
                      <span className="badge neutral">{orders.length} Orders</span>
                    </div>
                    <div suppressHydrationWarning className="orders-list">
                      {orders.map(o => (
                        <div
                          key={o.id}
                          className={`order-item ${selectedOrderId === o.id ? 'active' : ''}`}
                          onClick={() => setSelectedOrderId(o.id)}
                        >
                          <div suppressHydrationWarning className="order-item-header">
                            <strong>{o.id}</strong>
                            <span className={`badge ${o.status.includes('disputed') ? 'danger' : o.deliveryStatus === 'DELIVERED' ? 'success' : 'neutral'}`}>
                              {o.deliveryStatus || o.status}
                            </span>
                          </div>
                          <div suppressHydrationWarning className="order-item-details">
                            <span>{o.item}</span> · <strong>${o.amount.toFixed(2)}</strong>
                          </div>
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                            Customer: {o.speaker} · {o.deliveryAgentName ? `Courier: ${o.deliveryAgentName}` : 'Unassigned'}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CASE / ORDER INSPECTOR */}
                  {activeSelectedOrder ? (
                    <div suppressHydrationWarning className="portal-card">
                      <div suppressHydrationWarning className="section-title">
                        <h3>Order & Case Details · {activeSelectedOrder.id}</h3>
                        {!activeSelectedOrder.deliveryAgentId && (
                          <button className="button primary small" onClick={() => setAssigningOrder(activeSelectedOrder)}>
                            <Truck size={14} /> Assign Courier
                          </button>
                        )}
                      </div>

                      <div suppressHydrationWarning className="details-grid" style={{ marginBottom: 'var(--s4)' }}>
                        <div>
                          <label>Item</label>
                          <strong>{activeSelectedOrder.item}</strong>
                        </div>
                        <div>
                          <label>Amount</label>
                          <strong>${activeSelectedOrder.amount.toFixed(2)}</strong>
                        </div>
                        <div>
                          <label>Customer</label>
                          <strong>{activeSelectedOrder.speaker}</strong>
                        </div>
                        <div>
                          <label>Delivery Address</label>
                          <small>{activeSelectedOrder.deliveryAddress || 'Standard Shipping Address'}</small>
                        </div>
                        <div>
                          <label>Courier Assigned</label>
                          <strong>{activeSelectedOrder.deliveryAgentName || 'Not yet assigned'}</strong>
                        </div>
                        <div>
                          <label>Delivery Status</label>
                          <span className="badge neutral">{activeSelectedOrder.deliveryStatus || 'READY_FOR_ASSIGNMENT'}</span>
                        </div>
                      </div>

                      {activeSelectedOrder.deliveryProof && (
                        <div suppressHydrationWarning className="proof-box" style={{ background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)', marginBottom: 'var(--s4)' }}>
                          <h4>Courier Delivery Proof</h4>
                          <p>Note: &ldquo;{activeSelectedOrder.deliveryProof.note}&rdquo;</p>
                          {activeSelectedOrder.deliveryProof.photoUrl && (
                            <img 
                              src={activeSelectedOrder.deliveryProof.photoUrl} 
                              alt="Proof" 
                              style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--rds-radius-sm)', marginTop: 8 }} 
                            />
                          )}
                        </div>
                      )}

                      {/* COPILOT Q&A */}
                      <div suppressHydrationWarning className="copilot-box">
                        <h4>AI Case Intelligence</h4>
                        <form onSubmit={handleAskCopilot} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <input
                            type="text"
                            placeholder="Ask about this case (e.g. What evidence conflicts?)"
                            value={copilotQuestion}
                            onChange={e => setCopilotQuestion(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button type="submit" className="button primary small" disabled={copilotLoading}>
                            {copilotLoading ? <RotateCw size={14} className="spin" /> : <Send size={14} />}
                          </button>
                        </form>
                        {copilotAnswer && (
                          <div suppressHydrationWarning className="ai-answer-box" style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--rds-radius-md)', fontSize: '0.85rem' }}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{copilotAnswer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div suppressHydrationWarning className="portal-card empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                      <p>Select an order from the list to view operational details.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL ORDERS */}
          {tab === 'orders' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>All Customer Orders</h2>
                  <p>Authoritative order ledger queried directly from the SQLite database.</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Inbox size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Orders Found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>No customer orders have been placed yet.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="orders-table-wrapper">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Courier</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{o.item}</td>
                          <td>{o.speaker}</td>
                          <td>${o.amount.toFixed(2)}</td>
                          <td>
                            <span className={`badge ${o.status.includes('disputed') ? 'danger' : o.deliveryStatus === 'DELIVERED' ? 'success' : 'neutral'}`}>
                              {o.deliveryStatus || o.status}
                            </span>
                          </td>
                          <td>{o.deliveryAgentName || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                          <td>
                            {!o.deliveryAgentId ? (
                              <button className="button primary small" onClick={() => setAssigningOrder(o)}>
                                Assign Courier
                              </button>
                            ) : (
                              <button className="button secondary small" onClick={() => { setSelectedOrderId(o.id); setTab('dashboard'); }}>
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* TAB 3: REFUND REVIEWS */}
          {tab === 'refund-reviews' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Dispute & Refund Evidence Reviews</h2>
                  <p>Reconcile courier dropoff claims against customer statements with explainable scoring.</p>
                </div>
              </div>

              {disputedOrders.length === 0 ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <ShieldCheck size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Active Disputes</h3>
                  <p style={{ color: 'var(--text-muted)' }}>When a customer files a delivery dispute or refund request, it will appear here for review.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="two-column-layout">
                  {/* DISPUTES LIST */}
                  <div suppressHydrationWarning className="orders-list">
                    {disputedOrders.map(o => (
                      <div
                        key={o.id}
                        className={`order-item ${selectedOrderId === o.id ? 'active' : ''}`}
                        onClick={() => setSelectedOrderId(o.id)}
                      >
                        <div suppressHydrationWarning className="order-item-header">
                          <strong>{o.id}</strong>
                          <span className="badge danger">Disputed</span>
                        </div>
                        <div suppressHydrationWarning className="order-item-details">
                          <span>{o.item}</span> · <strong>${o.amount.toFixed(2)}</strong>
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>Customer: {o.speaker}</small>
                      </div>
                    ))}
                  </div>

                  {/* ASSESSMENT & DECISION CONTROLS */}
                  {caseData && (
                    <div suppressHydrationWarning className="portal-card">
                      <div suppressHydrationWarning className="section-title">
                        <div>
                          <h3>Case Review · {caseData.order.id}</h3>
                          <small style={{ color: 'var(--text-muted)' }}>Customer: {caseData.order.speaker}</small>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="button primary small" onClick={() => setDecisionModal('APPROVE_REFUND')}>
                            Approve Refund
                          </button>
                          <button className="button secondary small" onClick={() => setDecisionModal('REQUEST_MORE_EVIDENCE')}>
                            Request Evidence
                          </button>
                          <button className="button secondary small" onClick={() => setDecisionModal('REJECT_REFUND')}>
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* ASSESSMENT SCORE */}
                      {assessment && (
                        <div suppressHydrationWarning className="score-summary-box" style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--rds-radius-md)', marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span className="eyebrow">Deterministic Assessment</span>
                              <h2 style={{ fontSize: '2rem', color: 'var(--brand-teal)' }}>{assessment.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span></h2>
                              <p style={{ fontSize: '0.85rem' }}>{assessment.levelLabel}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STATEMENTS & EVIDENCE */}
                      <div suppressHydrationWarning className="sources-list">
                        <h4>Case Sources & Statements</h4>
                        {caseData.sources.map(s => (
                          <div key={s.id} style={{ padding: 8, borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                            <strong>[{s.id}] {s.title}</strong>
                            <p style={{ marginTop: 4 }}>{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: DELIVERIES */}
          {tab === 'deliveries' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Active Courier Dispatch & Deliveries</h2>
                  <p>Live tracking of courier routes, dropoffs, and proof submissions.</p>
                </div>
              </div>
              {orders.filter(o => o.deliveryAgentId).length === 0 ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Truck size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Deliveries Assigned</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Assign a delivery agent to an order to begin courier tracking.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="orders-table-wrapper">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Courier Name</th>
                        <th>Delivery Address</th>
                        <th>Delivery Status</th>
                        <th>Proof Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o => o.deliveryAgentId).map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{o.deliveryAgentName || 'Courier'}</td>
                          <td>{o.deliveryAddress || 'Standard Address'}</td>
                          <td>
                            <span className="badge neutral">{o.deliveryStatus || 'OUT_FOR_DELIVERY'}</span>
                          </td>
                          <td>
                            {o.deliveryProof ? (
                              <span className="badge success"><Check size={12} /> Photo & Note</span>
                            ) : (
                              <span className="badge neutral">Pending Dropoff</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* TAB 5: AUDIT */}
          {tab === 'audit' && caseData && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Operational Audit Trail & Action Ledger</h2>
                  <p>Immutable log of every order event, courier scan, AI assessment, and owner decision.</p>
                </div>
              </div>
              <div suppressHydrationWarning className="handoff-grid">
                {caseData.audits.map(a => (
                  <article key={a.id} className="audit-card">
                    <span className="badge neutral">{a.kind.replaceAll('_', ' ')}</span>
                    <p style={{ margin: 'var(--s2) 0' }}>{a.detail}</p>
                    <small style={{ color: 'var(--text-muted)' }}>Actor: {a.agent} · {new Date(a.at).toLocaleString()}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* ASSIGN COURIER MODAL */}
      {assigningOrder && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setAssigningOrder(null)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <h3>Assign Delivery Courier · {assigningOrder.id}</h3>
              <button className="icon-button" onClick={() => setAssigningOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignAgent}>
              <div suppressHydrationWarning className="form-group">
                <label>Item & Delivery Destination</label>
                <div style={{ background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)' }}>
                  <strong>{assigningOrder.item}</strong> ({assigningOrder.currency} {assigningOrder.amount.toFixed(2)})<br />
                  <small style={{ color: 'var(--text-muted)' }}>Destination: {assigningOrder.deliveryAddress || 'Standard Address'}</small>
                </div>
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Select Available Courier Agent</label>
                {agents.length === 0 ? (
                  <div style={{ background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No delivery agents are currently registered. A user must log in / register with the <strong>Delivery Agent</strong> role first.
                  </div>
                ) : (
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="portal-select"
                  >
                    {agents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.status} · {ag.activeDeliveries} active)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setAssigningOrder(null)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={busy || agents.length === 0}>
                  {busy ? 'Assigning…' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER DECISION MODAL */}
      {decisionModal && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setDecisionModal(null)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <div>
                <span className="eyebrow">Owner Decision Confirmation</span>
                <h3>{decisionModal.replaceAll('_', ' ')} · Case {selectedOrderId}</h3>
              </div>
              <button className="icon-button" onClick={() => setDecisionModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleOwnerDecision}>
              <div suppressHydrationWarning className="form-group">
                <label>Decision Reason / Audit Note</label>
                <textarea
                  rows={3}
                  required
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                  placeholder="Explain why this decision is made based on case evidence..."
                />
              </div>

              {decisionModal === 'REQUEST_MORE_EVIDENCE' && (
                <div suppressHydrationWarning className="form-group">
                  <label>Specific Evidence Required from Customer</label>
                  <input
                    type="text"
                    required
                    value={requiredEvidence}
                    onChange={e => setRequiredEvidence(e.target.value)}
                    placeholder="e.g. Photo of apartment entrance / building directory"
                  />
                </div>
              )}

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setDecisionModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Record Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
