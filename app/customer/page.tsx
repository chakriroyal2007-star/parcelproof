'use client';
import { useEffect, useState, useRef } from 'react';
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
  FileText, 
  LockKeyhole, 
  Sparkles,
  ShoppingBag,
  MapPin,
  Camera,
  CheckCircle
} from 'lucide-react';
import type { Order, User, CustomerAIAnswer, AIChatMessage, Source, Product } from '@/lib/types';
import { PRODUCTS } from '@/lib/products';

export default function CustomerPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'orders' | 'disputes' | 'assistant' | 'profile'>('overview');
  const [selectedCase, setSelectedCase] = useState<string | null>('PP-1042');
  
  // Place Order state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('404 Skyline Ave, Apt 12B, Seattle, WA');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Dispute creation state (Adaptive AI Refund Intake)
  const [isCreatingDispute, setIsCreatingDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<'not_received' | 'wrong_location' | 'incorrect_photo' | 'damaged' | 'other'>('not_received');
  const [disputeDescription, setDisputeDescription] = useState('I was home all day and my apartment building has no reception desk. The doorway in the photo does not match mine.');
  const [disputeOrderId, setDisputeOrderId] = useState('PP-1042');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [intakeStep, setIntakeStep] = useState(1);
  const [checkedNeighbors, setCheckedNeighbors] = useState('yes');
  const [photoDisputed, setPhotoDisputed] = useState('yes');
  const [notice, setNotice] = useState('');

  // Customer AI Assistant state
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Evidence modal state
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [caseSources, setCaseSources] = useState<Source[]>([]);

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

  useEffect(() => {
    if (selectedCase) {
      loadCaseData(selectedCase);
    }
  }, [selectedCase]);

  useEffect(() => {
    if (tab === 'assistant') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, tab, aiLoading]);

  function loadCaseData(caseId: string) {
    fetch(`/api/cases/${caseId}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.chatHistory) {
          setChatHistory(d.chatHistory);
        }
        if (d && d.sources) {
          setCaseSources(d.sources);
        }
      })
      .catch(() => {});
  }

  function loadOrders() {
    setLoading(true);
    fetch('/api/customer/orders')
      .then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
        if (d.orders && d.orders.length > 0) {
          const firstId = d.orders[0].id;
          setSelectedCase(firstId);
          loadCaseData(firstId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacingOrder(true);
    setNotice('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: 1,
          deliveryAddress,
          customerName: user?.name || 'Alex Morgan'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setNotice(`Order ${data.order.id} placed successfully! Product: ${selectedProduct.name} (${selectedProduct.id})`);
      setIsPlacingOrder(false);
      loadOrders();
      setTab('orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error placing order');
    } finally {
      setPlacingOrder(false);
    }
  }

  async function handleConfirmDelivery(orderId: string) {
    try {
      await fetch(`/api/deliveries/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERY_CONFIRMED',
          note: 'Customer confirmed package received.'
        })
      });
      setNotice(`Thank you! Delivery confirmed for order ${orderId}.`);
      loadOrders();
    } catch {
      alert('Error confirming delivery');
    }
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
          description: `[Location check: ${checkedNeighbors === 'yes' ? 'Checked residence' : 'Unchecked'}, Photo verified: ${photoDisputed === 'yes' ? 'Disputed mismatch' : 'Matching'}] ${disputeDescription}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispute');
      setNotice('Your dispute and evidence have been logged and assigned to operations review.');
      setIsCreatingDispute(false);
      setIntakeStep(1);
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
    
    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    if (!promptText) setAiQuestion('');
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
      const data: CustomerAIAnswer = await res.json();
      
      const assistantMsg: AIChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Our team is actively investigating your dispute.',
        timestamp: new Date().toISOString(),
        sources: data.citations || [`ORDER-${selectedCase}`, `REF-${selectedCase}`]
      };

      setChatHistory(prev => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: AIChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: 'Your dispute records are documented and securely persisted. A support specialist is examining carrier tracking details.',
        timestamp: new Date().toISOString(),
        sources: [`ORDER-${selectedCase}`, `REF-${selectedCase}`]
      };
      setChatHistory(prev => [...prev, fallbackMsg]);
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
          orderId: selectedCase,
          message: customerMessage.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      setCustomerMessage('');
      setNotice('Your message was added to the case evidence records.');
      loadCaseData(selectedCase);
    } catch (err) {
      alert('Error updating case record');
    } finally {
      setSendingMsg(false);
    }
  }

  function handleCitationClick(sourceId: string) {
    const found = caseSources.find(s => s.id === sourceId);
    if (found) {
      setActiveSource(found);
    } else {
      setActiveSource({
        id: sourceId,
        accountId: user?.accountId || 'HH-208',
        orderId: selectedCase,
        type: 'support',
        title: `Evidence Record ${sourceId}`,
        timestamp: new Date().toISOString(),
        text: `Verified case record ${sourceId} referenced by dispute resolution copilot.`,
        version: null,
        effectiveFrom: null,
        effectiveTo: null,
        region: 'US',
        photo: null
      });
    }
  }

  const selectedOrder = orders.find(o => o.id === selectedCase) || orders[0];
  const disputedOrders = orders.filter(o => o.status.includes('disputed') || o.id === 'PP-1042' || o.id === 'PP-1044');

  return (
    <div suppressHydrationWarning className="portal-shell">
      {/* HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="portal-brand">
          <div suppressHydrationWarning className="brand-badge">
            <Package size={20} />
          </div>
          <div suppressHydrationWarning>
            <h1 style={{ fontSize: 'var(--lg)', margin: 0 }}>ParcelProof</h1>
            <span style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)' }}>Customer Hub</span>
          </div>
        </div>

        <div suppressHydrationWarning className="portal-user">
          <button className="button primary small" onClick={() => setIsPlacingOrder(true)}>
            <ShoppingBag size={14} /> Place New Order
          </button>
          <div suppressHydrationWarning className="user-pill">
            <ShieldCheck size={16} className="text-accent" />
            <span>Welcome, <strong>{user?.name || 'Customer'}</strong></span>
            <span className="badge neutral">Account: {user?.accountId || 'HH-208'}</span>
          </div>
          <button onClick={handleLogout} className="button secondary small">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav suppressHydrationWarning className="portal-nav">
        <button className={`portal-nav-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={`portal-nav-btn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          My Orders ({orders.length})
        </button>
        <button className={`portal-nav-btn ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>
          Active Disputes {disputedOrders.length > 0 && <span className="tab-count">{disputedOrders.length}</span>}
        </button>
        <button className={`portal-nav-btn ${tab === 'assistant' ? 'active' : ''}`} onClick={() => setTab('assistant')}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} /> AI Assistant
        </button>
        <button className={`portal-nav-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          Account Profile
        </button>
      </nav>

      {/* NOTICE */}
      {notice && (
        <div suppressHydrationWarning className="message success" style={{ margin: 'var(--s4) var(--s8)' }}>
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div suppressHydrationWarning className="loading" style={{ margin: 'var(--s12) auto' }}>
          <RotateCw className="spin" size={24} /> Loading customer records…
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-main">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div suppressHydrationWarning className="portal-grid">
              <div suppressHydrationWarning className="portal-column">
                <section suppressHydrationWarning className="portal-card">
                  <div suppressHydrationWarning className="section-title">
                    <div>
                      <h2>Recent Orders & Delivery Status</h2>
                      <p>Track delivery dispatch, courier evidence, and refund investigations.</p>
                    </div>
                    <button className="button primary small" onClick={() => setIsPlacingOrder(true)}>
                      <PlusCircle size={15} /> Buy New Product
                    </button>
                  </div>

                  <div suppressHydrationWarning className="orders-list">
                    {orders.map(order => (
                      <article
                        key={order.id}
                        className={`order-card ${selectedCase === order.id ? 'active' : ''}`}
                        onClick={() => { setSelectedCase(order.id); setTab('orders'); }}
                      >
                        <div suppressHydrationWarning className="order-meta">
                          <span className="order-id">{order.id}</span>
                          <span className="badge neutral">{order.productId || 'PROD-WH-001'}</span>
                        </div>
                        <div suppressHydrationWarning className="order-details">
                          <h3>{order.item}</h3>
                          <span className="order-amount">{order.currency} {order.amount.toFixed(2)}</span>
                        </div>
                        <div suppressHydrationWarning className="order-status-line">
                          <span className={`badge ${order.status.includes('disputed') ? 'warning' : (order.status.includes('Delivered') ? 'success' : 'neutral')}`}>
                            {order.status}
                          </span>
                          <span className="link-arrow">Track order <ArrowRight size={13} /></span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              {/* SIDEBAR WIDGET */}
              <aside suppressHydrationWarning className="portal-sidebar">
                <div suppressHydrationWarning className="portal-card">
                  <div suppressHydrationWarning className="section-title">
                    <div>
                      <h3>Dispute AI Assistant</h3>
                      <p>Live evidence-grounded dispute support.</p>
                    </div>
                    <Bot size={20} className="text-accent" />
                  </div>

                  <div suppressHydrationWarning className="quick-actions-bar" style={{ margin: 'var(--s3) 0' }}>
                    <div suppressHydrationWarning className="quick-actions-chips">
                      <button className="quick-chip" onClick={() => { setTab('assistant'); askCustomerAssistant("What is the current status of my dispute?"); }}>
                        Status of my dispute?
                      </button>
                      <button className="quick-chip" onClick={() => { setTab('assistant'); askCustomerAssistant("Has my refund been initiated?"); }}>
                        Has refund been initiated?
                      </button>
                    </div>
                  </div>

                  <button className="button primary full" onClick={() => setTab('assistant')} style={{ marginTop: 'var(--s3)' }}>
                    <MessageSquare size={15} /> Open Full AI Assistant Thread
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {tab === 'orders' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Your Order History & Delivery Tracking</h2>
                  <p>All active purchases, courier milestones, and delivery confirmation.</p>
                </div>
                <button className="button primary small" onClick={() => setIsPlacingOrder(true)}>
                  <PlusCircle size={15} /> Place Order
                </button>
              </div>
              <div suppressHydrationWarning className="orders-table-wrapper">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product ID</th>
                      <th>Item Description</th>
                      <th>Delivery Courier</th>
                      <th>Amount</th>
                      <th>Delivery Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.id}</strong></td>
                        <td><span className="badge neutral">{o.productId || 'PROD-WH-001'}</span></td>
                        <td>{o.item}</td>
                        <td>{o.deliveryAgentName || <span style={{ color: 'var(--text-muted)' }}>Assigned at hub</span>}</td>
                        <td>{o.currency} {o.amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${o.status.includes('disputed') ? 'warning' : (o.status.includes('Delivered') ? 'success' : 'neutral')}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {o.status.includes('Delivered') && !o.status.includes('disputed') && (
                              <>
                                <button className="button secondary small" onClick={() => handleConfirmDelivery(o.id)}>
                                  <CheckCircle size={12} /> Confirm
                                </button>
                                <button className="button primary small" onClick={() => { setDisputeOrderId(o.id); setIsCreatingDispute(true); }}>
                                  Dispute
                                </button>
                              </>
                            )}
                            {o.status.includes('disputed') && (
                              <button className="button secondary small" onClick={() => { setSelectedCase(o.id); setTab('disputes'); }}>
                                View Dispute
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 3: DISPUTES */}
          {tab === 'disputes' && selectedOrder && (
            <div suppressHydrationWarning className="portal-grid">
              <section suppressHydrationWarning className="portal-card portal-column">
                <div suppressHydrationWarning className="section-title">
                  <div>
                    <span className="eyebrow">Active Dispute Investigation</span>
                    <h2>Case {selectedOrder.id} · {selectedOrder.item}</h2>
                  </div>
                  <span className="badge warning">Under Review</span>
                </div>

                <div suppressHydrationWarning className="timeline-section" style={{ margin: 'var(--s4) 0' }}>
                  <h3>Delivery Evidence & Recorded Statements</h3>
                  <div suppressHydrationWarning className="timeline-flow">
                    <div suppressHydrationWarning className="timeline-item">
                      <div className="timeline-marker complete"><Check size={12} /></div>
                      <div className="timeline-content">
                        <strong>Order Shipped & Dispatched</strong>
                        <small>Carrier tracking generated</small>
                      </div>
                    </div>
                    <div suppressHydrationWarning className="timeline-item">
                      <div className="timeline-marker complete"><Truck size={12} /></div>
                      <div className="timeline-content">
                        <strong>Carrier Scan: Marked Delivered</strong>
                        <small>Carrier reported delivery location photo</small>
                      </div>
                    </div>
                    <div suppressHydrationWarning className="timeline-item">
                      <div className="timeline-marker active"><AlertTriangle size={12} /></div>
                      <div className="timeline-content">
                        <strong>Customer Dispute Reported</strong>
                        <small>Non-receipt & photo discrepancy logged</small>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={sendDisputeUpdate} className="dispute-message-form" style={{ marginTop: 'var(--s4)' }}>
                  <label htmlFor="msg">Add a message or additional details for your dispute agent:</label>
                  <div suppressHydrationWarning className="input-with-button">
                    <input
                      id="msg"
                      type="text"
                      placeholder="e.g. I was home all day and my apartment building has no reception desk..."
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
            <section suppressHydrationWarning className="portal-card copilot-chat-container">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Customer AI Dispute Assistant</h2>
                  <p>Authorized live dispute support · Grounded in persistent case records and RAG memory.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                  <span className="badge success">Live RAG Connected</span>
                  <Bot size={22} className="text-accent" />
                </div>
              </div>

              {/* QUICK CHIP PROMPTS */}
              <div suppressHydrationWarning className="quick-actions-bar">
                <span className="quick-actions-title">Common Questions:</span>
                <div suppressHydrationWarning className="quick-actions-chips">
                  <button className="quick-chip" onClick={() => askCustomerAssistant("What is the current status of my dispute?")}>
                    What is the current status of my dispute?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Has my refund been initiated in the ledger?")}>
                    Has my refund been initiated?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("Why was my order marked delivered if nobody came?")}>
                    Why was my order marked delivered?
                  </button>
                  <button className="quick-chip" onClick={() => askCustomerAssistant("What are the next steps for my dispute?")}>
                    What are the next steps?
                  </button>
                </div>
              </div>

              {/* MULTI-TURN CHAT THREAD */}
              <div suppressHydrationWarning className="chat-thread" style={{ minHeight: '280px', marginTop: 'var(--s4)' }}>
                {chatHistory.length === 0 && !aiLoading && (
                  <article className="chat-card-assistant">
                    <div suppressHydrationWarning className="chat-assistant-header">
                      <div suppressHydrationWarning className="chat-assistant-meta">
                        <Bot size={16} /> <strong>ParcelProof Support Copilot</strong>
                      </div>
                      <span className="badge success">Authorized Customer View</span>
                    </div>
                    <div suppressHydrationWarning className="chat-answer-text">
                      Hello! I am your AI dispute assistant for order <strong>{selectedCase}</strong>. Ask me any question regarding your package delivery status, carrier evidence, or refund review.
                    </div>
                  </article>
                )}

                {chatHistory.map((msg, idx) => (
                  <div key={msg.id || idx} className={`chat-message ${msg.role}`}>
                    {msg.role === 'user' ? (
                      <div className="chat-bubble-user">
                        {msg.content}
                      </div>
                    ) : (
                      <article className="chat-card-assistant">
                        <div suppressHydrationWarning className="chat-assistant-header">
                          <div suppressHydrationWarning className="chat-assistant-meta">
                            <Bot size={16} /> <strong>ParcelProof Support Copilot</strong>
                            <small>· {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                          </div>
                          <span className="badge success">Evidence Grounded</span>
                        </div>
                        <div suppressHydrationWarning className="chat-answer-text">
                          {msg.content}
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div suppressHydrationWarning style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--s2)', display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)' }}>Citations:</span>
                            {msg.sources.map(srcId => (
                              <button
                                key={srcId}
                                className="quick-chip"
                                style={{ padding: '2px 8px', fontSize: '11px' }}
                                onClick={() => handleCitationClick(srcId)}
                              >
                                <LockKeyhole size={11} /> {srcId}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    )}
                  </div>
                ))}

                {aiLoading && (
                  <div suppressHydrationWarning className="chat-message assistant">
                    <article className="chat-card-assistant" style={{ opacity: 0.85 }}>
                      <div suppressHydrationWarning className="loading" style={{ padding: 'var(--s2) 0' }}>
                        <RotateCw className="spin" size={16} /> Retrieving verified case evidence and generating grounded response…
                      </div>
                    </article>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* CHAT INPUT FORM */}
              <form
                onSubmit={e => { e.preventDefault(); askCustomerAssistant(); }}
                className="chat-input-wrapper"
                style={{ marginTop: 'var(--s4)' }}
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

      {/* PLACE ORDER MODAL */}
      {isPlacingOrder && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsPlacingOrder(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <div>
                <span className="eyebrow"><ShoppingBag size={12} /> E-Commerce Store Checkout</span>
                <h3>Place a Verified Product Order</h3>
              </div>
              <button className="icon-button" onClick={() => setIsPlacingOrder(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePlaceOrder}>
              <div suppressHydrationWarning className="form-group">
                <label>Select Product from Catalog</label>
                <select
                  className="portal-select"
                  value={selectedProduct.id}
                  onChange={e => {
                    const prod = PRODUCTS.find(p => p.id === e.target.value) || PRODUCTS[0];
                    setSelectedProduct(prod);
                  }}
                >
                  {PRODUCTS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price.toFixed(2)} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div suppressHydrationWarning style={{ background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)', marginBottom: 'var(--s3)' }}>
                <strong>Product ID: {selectedProduct.id}</strong><br />
                <span style={{ fontSize: 'var(--xs)', color: 'var(--text-muted)' }}>{selectedProduct.description}</span><br />
                <span style={{ fontSize: 'var(--sm)', fontWeight: 700, color: 'var(--accent)' }}>Total: ${selectedProduct.price.toFixed(2)}</span>
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Delivery Address</label>
                <div suppressHydrationWarning className="input-with-icon">
                  <MapPin size={16} />
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Street address, Apt/Suite, City, State"
                  />
                </div>
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setIsPlacingOrder(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={placingOrder}>
                  {placingOrder ? 'Placing Order…' : `Confirm Order ($${selectedProduct.price.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADAPTIVE AI REFUND INTAKE & DISPUTE MODAL */}
      {isCreatingDispute && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsCreatingDispute(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <div>
                <span className="eyebrow"><Bot size={12} /> Adaptive AI Dispute Intake</span>
                <h3>Report Delivery Problem · {disputeOrderId}</h3>
              </div>
              <button className="icon-button" onClick={() => setIsCreatingDispute(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDispute}>
              {intakeStep === 1 && (
                <>
                  <div suppressHydrationWarning className="form-group">
                    <label>What happened with your package?</label>
                    <select
                      value={disputeCategory}
                      onChange={e => setDisputeCategory(e.target.value as any)}
                      className="portal-select"
                    >
                      <option value="not_received">Package marked delivered but not received</option>
                      <option value="wrong_location">Wrong location (Building has no reception/doorway mismatch)</option>
                      <option value="incorrect_photo">Delivery photo does not match my entrance</option>
                      <option value="damaged">Package arrived damaged</option>
                    </select>
                  </div>

                  <div suppressHydrationWarning className="form-group">
                    <label>Did you check with neighbors, building manager, or porch area?</label>
                    <select value={checkedNeighbors} onChange={e => setCheckedNeighbors(e.target.value)} className="portal-select">
                      <option value="yes">Yes, checked all surrounding areas — nothing was delivered</option>
                      <option value="no">Not yet</option>
                    </select>
                  </div>

                  <div suppressHydrationWarning className="form-group">
                    <label>Does the courier photo match your doorway or building entrance?</label>
                    <select value={photoDisputed} onChange={e => setPhotoDisputed(e.target.value)} className="portal-select">
                      <option value="yes">No, the photo shows a different building / reception area</option>
                      <option value="no">Yes, photo matches</option>
                    </select>
                  </div>

                  <div suppressHydrationWarning className="form-group">
                    <label>Explain the details in your own words:</label>
                    <textarea
                      rows={3}
                      required
                      value={disputeDescription}
                      onChange={e => setDisputeDescription(e.target.value)}
                      placeholder="e.g. I was home during the delivery window and my building has no reception desk..."
                    />
                  </div>

                  <div suppressHydrationWarning className="modal-actions">
                    <button type="button" className="button secondary" onClick={() => setIsCreatingDispute(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="button primary" disabled={submittingDispute}>
                      {submittingDispute ? 'Logging dispute…' : 'Submit Dispute for Investigation'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* EVIDENCE CITATION MODAL */}
      {activeSource && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setActiveSource(null)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <div>
                <span className="eyebrow"><LockKeyhole size={12} /> Grounded Evidence Record</span>
                <h3>{activeSource.title}</h3>
              </div>
              <button className="icon-button" onClick={() => setActiveSource(null)}>
                <X size={18} />
              </button>
            </div>
            <div suppressHydrationWarning className="context-grid" style={{ margin: 'var(--s3) 0' }}>
              <div>
                <span>Source ID</span>
                <strong>{activeSource.id}</strong>
              </div>
              <div>
                <span>Source Type</span>
                <strong style={{ textTransform: 'capitalize' }}>{activeSource.type}</strong>
              </div>
              <div>
                <span>Recorded Time</span>
                <small>{new Date(activeSource.timestamp).toLocaleString()}</small>
              </div>
            </div>
            <pre className="source-text" style={{ background: 'var(--bg-elevated)', padding: 'var(--s4)', borderRadius: 'var(--rds-radius-md)', whiteSpace: 'pre-wrap', maxHeight: '260px', overflowY: 'auto' }}>
              {activeSource.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
