'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Clock3, 
  Check, 
  MessageSquare, 
  AlertTriangle, 
  RotateCw, 
  LogOut, 
  Bot, 
  Send, 
  PlusCircle, 
  Truck, 
  CheckCircle2, 
  X,
  FileText
} from 'lucide-react';
import type { Order, User, CustomerAIAnswer } from '@/lib/types';

export default function CustomerPortal() {
  const router = useRouter();
    const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'orders' | 'disputes' | 'assistant' | 'profile'>('overview');
  const [selectedCase, setSelectedCase] = useState<string | null>('PP-1042');
  
  // Dispute creation state
  const [isCreatingDispute, setIsCreatingDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<'not_received' | 'wrong_location' | 'incorrect_photo' | 'damaged' | 'other'>('not_received');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeOrderId, setDisputeOrderId] = useState('PP-1042');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [notice, setNotice] = useState('');

  // Customer AI Assistant state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<CustomerAIAnswer | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Message state
  const [customerMessage, setCustomerMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'CUSTOMER') {
          // If not logged in as customer, default to Alex Morgan demo session
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alex@example.com', password: 'password123' })
          })
            .then(r => r.json())
            .then(authData => {
              setUser(authData.user);
              loadOrders();
            });
        } else {
          setUser(d.user);
          loadOrders();
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  function loadOrders() {
    setLoading(true);
    fetch('/api/customer/orders')
      .then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
        if (d.orders && d.orders.length > 0) {
          setSelectedCase(d.orders[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleCreateDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeDescription.trim()) return;
    setSubmittingDispute(true);
    setNotice('');
    try {
      const res = await fetch('/api/customer/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: disputeOrderId,
          category: disputeCategory,
          description: disputeDescription
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispute');
      setNotice('Your dispute has been logged and assigned to our resolution team.');
      setIsCreatingDispute(false);
      setDisputeDescription('');
      loadOrders();
      setTab('disputes');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error submitting dispute');
    } finally {
      setSubmittingDispute(false);
    }
  }

  async function askCustomerAssistant(promptText?: string) {
    const question = promptText || aiQuestion;
    if (!question.trim() || !selectedCase) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/customer/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase,
          question: question.trim()
        })
      });
      const data = await res.json();
      setAiAnswer(data);
      if (!promptText) setAiQuestion('');
    } catch {
      setAiAnswer({
        answer: 'Our customer support assistants are currently reviewing your dispute.',
        caseStatus: 'Under Review',
        refundStatus: 'Processing',
        nextStep: 'Check back shortly.',
        authorizedForCustomer: true
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function sendDisputeUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!customerMessage.trim() || !selectedCase) return;
    setSendingMsg(true);
    try {
      const res = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase,
          message: customerMessage.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      setNotice('Update sent to dispute specialist.');
      setCustomerMessage('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  }

  const activeDisputes = orders.filter(o => o.status.includes('disputed'));
  const currentOrder = orders.find(o => o.id === selectedCase) || orders[0];

  return (
    <div suppressHydrationWarning className="portal-shell">
      {/* HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="brand">
          <span className="brand-icon"><Package size={22} /></span>
          Parcel<span>Proof</span> <small style={{ marginLeft: 'var(--s2)', opacity: 0.7 }}>Customer Hub</small>
        </div>
        <div suppressHydrationWarning className="portal-user-bar">
          <span className="user-name">Welcome, <strong>{user?.name || 'Customer'}</strong></span>
          <span className="badge neutral">Account: {user?.accountId || 'HH-208'}</span>
          <button className="button secondary icon-only" onClick={handleLogout} title="Sign out">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav suppressHydrationWarning className="portal-nav">
        {[
          ['overview', 'Overview'],
          ['orders', 'My Orders'],
          ['disputes', `Active Disputes (${activeDisputes.length})`],
          ['assistant', 'AI Assistant'],
          ['profile', 'Account Profile']
        ].map(([key, label]) => (
          <button
            key={key}
            className={`portal-nav-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key as any)}
          >
            {label}
          </button>
        ))}
      </nav>

      {notice && (
        <div suppressHydrationWarning className="message success" role="status" style={{ margin: 'var(--s4) var(--s8) 0' }}>
          <Check size={16} /> {notice}
        </div>
      )}

      {loading ? (
        <div suppressHydrationWarning className="loading" style={{ padding: 'var(--s12)' }}>
          <RotateCw className="spin" /> Loading your orders and disputes…
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-content">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div suppressHydrationWarning className="customer-overview-grid">
              <section suppressHydrationWarning className="portal-card">
                <div suppressHydrationWarning className="section-title">
                  <div>
                    <h2>Dispute Resolution Overview</h2>
                    <p>Track delivery investigations and historical promises in real time.</p>
                  </div>
                  <ShieldCheck size={22} className="text-accent" />
                </div>

                {activeDisputes.length > 0 ? (
                  <div suppressHydrationWarning className="active-dispute-banner">
                    <div suppressHydrationWarning className="flexline between">
                      <div>
                        <span className="badge warning">Dispute in progress</span>
                        <h3 style={{ marginTop: 'var(--s2)' }}>Order {activeDisputes[0].id} · {activeDisputes[0].item}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--sm)' }}>
                          Issue: Non-receipt dispute reported. Evidence review in progress.
                        </p>
                      </div>
                      <button className="button primary" onClick={() => { setSelectedCase(activeDisputes[0].id); setTab('disputes'); }}>
                        View details <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div suppressHydrationWarning className="empty-inline">
                    <CheckCircle2 size={20} className="text-good" />
                    <span>All your orders are delivered with no active disputes.</span>
                  </div>
                )}

                <div suppressHydrationWarning className="portal-stats-row" style={{ marginTop: 'var(--s6)' }}>
                  <div suppressHydrationWarning className="stat-box">
                    <span className="stat-num">{orders.length}</span>
                    <span className="stat-label">Total Orders</span>
                  </div>
                  <div suppressHydrationWarning className="stat-box">
                    <span className="stat-num">{activeDisputes.length}</span>
                    <span className="stat-label">Active Disputes</span>
                  </div>
                  <div suppressHydrationWarning className="stat-box">
                    <span className="stat-num">{orders.filter(o => !o.status.includes('disputed')).length}</span>
                    <span className="stat-label">Completed Orders</span>
                  </div>
                </div>
              </section>

              {/* QUICK ASSISTANT WIDGET */}
              <aside className="portal-card">
                <div suppressHydrationWarning className="section-title">
                  <div>
                    <h2>Customer Assistant</h2>
                    <p>Get immediate status explanations</p>
                  </div>
                  <Bot size={20} className="text-accent" />
                </div>
                <p style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)' }}>
                  Ask questions regarding case <strong>{currentOrder?.id || 'PP-1042'}</strong>:
                </p>
                <div suppressHydrationWarning className="quick-chip-stack" style={{ margin: 'var(--s3) 0' }}>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("What's happening with my dispute?")}>
                    What's happening with my dispute?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Has my refund been processed?")}>
                    Has my refund been processed?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Why is my delivery disputed?")}>
                    Why is my delivery disputed?
                  </button>
                </div>
                {aiLoading && <div suppressHydrationWarning className="loading"><RotateCw className="spin" /> Checking case status…</div>}
                {aiAnswer && (
                  <div suppressHydrationWarning className="customer-ai-result">
                    <p><strong>Status:</strong> {aiAnswer.caseStatus}</p>
                    <p style={{ marginTop: 'var(--s2)' }}>{aiAnswer.answer}</p>
                    <small style={{ display: 'block', marginTop: 'var(--s2)', color: 'var(--text-muted)' }}>
                      <strong>Next Step:</strong> {aiAnswer.nextStep}
                    </small>
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {tab === 'orders' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Your Order History</h2>
                  <p>All purchases and delivery tracking records.</p>
                </div>
                <button className="button primary" onClick={() => setIsCreatingDispute(true)}>
                  <PlusCircle size={16} /> Report delivery issue
                </button>
              </div>

              <div suppressHydrationWarning className="orders-table-wrapper">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Item Description</th>
                      <th>Amount</th>
                      <th>Delivery Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.id}</strong></td>
                        <td>{o.item}</td>
                        <td>{o.currency} {o.amount}</td>
                        <td>
                          <span className={`badge ${o.status.includes('disputed') ? 'warning' : 'success'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.status.includes('disputed') ? (
                            <button
                              className="text-button"
                              onClick={() => { setSelectedCase(o.id); setTab('disputes'); }}
                            >
                              View dispute →
                            </button>
                          ) : (
                            <button
                              className="text-button"
                              onClick={() => { setDisputeOrderId(o.id); setIsCreatingDispute(true); }}
                            >
                              Report issue
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 3: DISPUTES */}
          {tab === 'disputes' && (
            <div suppressHydrationWarning className="customer-dispute-layout">
              <section suppressHydrationWarning className="portal-card">
                <div suppressHydrationWarning className="section-title">
                  <div>
                    <h2>Dispute Details · {currentOrder?.id}</h2>
                    <p>{currentOrder?.item} ({currentOrder?.currency} {currentOrder?.amount})</p>
                  </div>
                  <span className="badge warning">{currentOrder?.status}</span>
                </div>

                <div suppressHydrationWarning className="delivery-timeline-tracker">
                  <div suppressHydrationWarning className="step done">
                    <span className="step-icon"><Check size={14} /></span>
                    <span className="step-label">Order Placed</span>
                  </div>
                  <div suppressHydrationWarning className="step done">
                    <span className="step-icon"><Truck size={14} /></span>
                    <span className="step-label">Shipped</span>
                  </div>
                  <div suppressHydrationWarning className="step done">
                    <span className="step-icon"><Truck size={14} /></span>
                    <span className="step-label">Carrier Scan (Delivered)</span>
                  </div>
                  <div suppressHydrationWarning className="step active">
                    <span className="step-icon"><AlertTriangle size={14} /></span>
                    <span className="step-label">Dispute Under Review</span>
                  </div>
                </div>

                <div suppressHydrationWarning className="dispute-explanation-box">
                  <h4>Investigation Summary</h4>
                  <p>
                    You reported that you did not receive this parcel despite the courier marking it as delivered.
                    Our dispute specialists are currently examining carrier notes, uploaded photos, and policy criteria.
                  </p>
                </div>

                {/* SEND MESSAGE */}
                <form onSubmit={sendDisputeUpdate} className="dispute-message-form">
                  <label htmlFor="msg">Add a message or additional details for your dispute agent:</label>
                  <div suppressHydrationWarning className="input-with-button">
                    <input
                      id="msg"
                      type="text"
                      placeholder="e.g. I checked with the building manager and no package was delivered..."
                      value={customerMessage}
                      onChange={e => setCustomerMessage(e.target.value)}
                      disabled={sendingMsg}
                    />
                    <button type="submit" className="button primary" disabled={!customerMessage.trim() || sendingMsg}>
                      <Send size={14} /> Send
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {/* TAB 4: ASSISTANT */}
          {tab === 'assistant' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Customer AI Dispute Assistant</h2>
                  <p>Authorized dispute support · Answers questions based on verified case records.</p>
                </div>
                <Bot size={24} className="text-accent" />
              </div>

              <div suppressHydrationWarning className="quick-actions-bar" style={{ margin: 'var(--s4) 0' }}>
                <span className="quick-actions-title">Common Questions:</span>
                <div suppressHydrationWarning className="quick-actions-chips">
                  <button className="quick-chip" onClick={() => askCustomerAssistant("What is the current status of my dispute?")}>
                    What is the current status of my dispute?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Has my refund been initiated?")}>
                    Has my refund been initiated?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Why was my order marked delivered if nobody came?")}>
                    Why was my order marked delivered if nobody came?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("What are the next steps for my dispute?")}>
                    What are the next steps for my dispute?
                  </button>
                </div>
              </div>

              {aiLoading && (
                <div suppressHydrationWarning className="loading" style={{ margin: 'var(--s6) 0' }}>
                  <RotateCw className="spin" /> Checking dispute record…
                </div>
              )}

              {aiAnswer && (
                <article className="chat-card-assistant" style={{ margin: 'var(--s4) 0' }}>
                  <div suppressHydrationWarning className="chat-assistant-header">
                    <div suppressHydrationWarning className="chat-assistant-meta">
                      <Bot size={16} /> <strong>ParcelProof Support Copilot</strong>
                    </div>
                    <span className="badge success">Authorized Customer View</span>
                  </div>
                  <div suppressHydrationWarning className="chat-answer-text" style={{ padding: 'var(--s3) 0' }}>
                    {aiAnswer.answer}
                  </div>
                  <div style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)', borderTop: '1px solid var(--line)', paddingTop: 'var(--s2)' }}>
                    <strong>Expected Resolution Next Step:</strong> {aiAnswer.nextStep}
                  </div>
                </article>
              )}

              <form
                onSubmit={e => { e.preventDefault(); askCustomerAssistant(); }}
                className="chat-input-wrapper"
                style={{ marginTop: 'var(--s6)' }}
              >
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type your question about your delivery dispute..."
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  disabled={aiLoading}
                />
                <button type="submit" className="button primary" disabled={!aiQuestion.trim() || aiLoading}>
                  <Send size={15} /> Ask
                </button>
              </form>
            </section>
          )}

          {/* TAB 5: PROFILE */}
          {tab === 'profile' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Customer Account Details</h2>
                  <p>Household account information and verified identities.</p>
                </div>
              </div>
              <div suppressHydrationWarning className="context-grid">
                <div>
                  <span>Account Name</span>
                  <strong>{user?.name || 'Alex Morgan'}</strong>
                </div>
                <div>
                  <span>Account Email</span>
                  <strong>{user?.email || 'alex@example.com'}</strong>
                </div>
                <div>
                  <span>Household ID</span>
                  <strong>{user?.accountId || 'HH-208'}</strong>
                </div>
                <div>
                  <span>Identity Verification</span>
                  <strong className="good"><Check size={15} /> Verified Account Holder</strong>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* CREATE DISPUTE MODAL */}
      {isCreatingDispute && (
        <div suppressHydrationWarning className="modal-backdrop">
          <div suppressHydrationWarning className="modal-card">
            <div suppressHydrationWarning className="modal-header">
              <h3>Report a Delivery Dispute</h3>
              <button className="icon-button" onClick={() => setIsCreatingDispute(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDispute}>
              <div suppressHydrationWarning className="form-group">
                <label>Select Order</label>
                <select
                  value={disputeOrderId}
                  onChange={e => setDisputeOrderId(e.target.value)}
                  className="portal-select"
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.item} ({o.currency} {o.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Issue Reason</label>
                <select
                  value={disputeCategory}
                  onChange={e => setDisputeCategory(e.target.value as any)}
                  className="portal-select"
                >
                  <option value="not_received">Didn't receive package (Marked delivered)</option>
                  <option value="wrong_location">Wrong delivery location (Building has no reception)</option>
                  <option value="incorrect_photo">Incorrect delivery photo</option>
                  <option value="damaged">Damaged package</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Describe what happened</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the situation (e.g. I was home all day, checked with neighbors, and the doorway in the photo does not match mine)..."
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                />
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setIsCreatingDispute(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={submittingDispute}>
                  {submittingDispute ? 'Logging dispute…' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
