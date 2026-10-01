'use client';
import RoleSwitcher from '@/app/components/RoleSwitcher';
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
  CheckCircle,
  Inbox
} from 'lucide-react';
import type { Order, User, CustomerAIAnswer, AIChatMessage, Source, Product } from '@/lib/types';
import { PRODUCTS } from '@/lib/products';

export default function CustomerPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'orders' | 'disputes' | 'assistant' | 'profile'>('overview');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  
  // Place Order state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('404 Skyline Ave, Apt 12B, Seattle, WA');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Dispute creation state
  const [isCreatingDispute, setIsCreatingDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<'not_received' | 'wrong_location' | 'incorrect_photo' | 'damaged' | 'other'>('not_received');
  const [disputeDescription, setDisputeDescription] = useState('I was home all day and my apartment building has no reception desk.');
  const [disputeOrderId, setDisputeOrderId] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
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
          router.push('/login');
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
    } else {
      setChatHistory([]);
      setCaseSources([]);
    }
  }, [selectedCase]);

  useEffect(() => {
    if (tab === 'assistant') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, tab, aiLoading]);

  function loadOrders() {
    setLoading(true);
    fetch('/api/customer/orders')
      .then(r => r.json())
      .then(d => {
        const list: Order[] = d.orders || [];
        setOrders(list);
        if (list.length > 0) {
          setSelectedCase(prev => {
            if (prev && list.some(o => o.id === prev)) return prev;
            const disputed = list.find(o => o.status.includes('disputed'));
            return disputed ? disputed.id : list[0].id;
          });
        } else {
          setSelectedCase(null);
        }
      })
      .catch(() => setNotice('Failed to load orders'))
      .finally(() => setLoading(false));
  }

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

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: 1,
          deliveryAddress: deliveryAddress.trim() || '404 Skyline Ave, Apt 12B, Seattle, WA',
          customerName: user?.name || 'Customer'
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to place order');

      setNotice(`Order placed successfully! Order ID: ${d.order.id}`);
      setIsPlacingOrder(false);
      loadOrders();
      setSelectedCase(d.order.id);
      setTab('orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Order placement failed');
    } finally {
      setPlacingOrder(false);
    }
  }

  async function handleCreateDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeOrderId) return;
    setSubmittingDispute(true);
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
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit dispute');

      setNotice(`Dispute opened for order ${disputeOrderId}. AI investigation started.`);
      setIsCreatingDispute(false);
      loadOrders();
      setSelectedCase(disputeOrderId);
      setTab('assistant');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Dispute submission failed');
    } finally {
      setSubmittingDispute(false);
    }
  }

  async function handleAskAssistant(e?: React.FormEvent, customQ?: string) {
    if (e) e.preventDefault();
    const question = customQ || aiQuestion;
    if (!question.trim() || !selectedCase) return;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setAiQuestion('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/customer/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase,
          question
        })
      });
      const data: CustomerAIAnswer = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Assistant response failed');

      const assistantMsg: AIChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.citations || [`ORDER-${selectedCase}`, `REF-${selectedCase}`]
      };
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: AIChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: 'I could not connect to the assistant service right now. Please try again or provide additional delivery details.',
        timestamp: new Date().toISOString(),
        sources: [`ORDER-${selectedCase}`, `REF-${selectedCase}`]
      };
      setChatHistory(prev => [...prev, fallbackMsg]);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!customerMessage.trim() || !selectedCase) return;
    setSendingMsg(true);
    try {
      const res = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedCase,
          speaker: user?.name || 'Customer',
          message: customerMessage.trim()
        })
      });
      if (!res.ok) throw new Error('Message sending failed');
      setCustomerMessage('');
      setNotice('Evidence submitted and indexed into case intelligence.');
      loadCaseData(selectedCase);
      handleAskAssistant(undefined, 'I just added new information to my case. Can you confirm what you have recorded?');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  }

  const selectedOrder = orders.find(o => o.id === selectedCase) || (orders.length > 0 ? orders[0] : null);
  const disputedOrders = orders.filter(o => o.status.includes('disputed'));

  return (
    <div suppressHydrationWarning className="portal-container">
      {/* TOP HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="header-left">
          <div suppressHydrationWarning className="brand-logo">
            <Package size={22} className="brand-icon" />
            <span>Parcel<span className="brand-accent">Proof</span></span>
          </div>
          <span className="badge success">Customer Portal</span>
        </div>

        <div suppressHydrationWarning className="header-right">
          <RoleSwitcher currentRole="CUSTOMER" currentName={user?.name || 'Customer'} />
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
        <button className={`nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          <ShoppingBag size={16} /> Dashboard
        </button>
        <button className={`nav-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          <Package size={16} /> My Orders ({orders.length})
        </button>
        <button className={`nav-item ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>
          <AlertTriangle size={16} /> My Disputes ({disputedOrders.length})
        </button>
        <button className={`nav-item ${tab === 'assistant' ? 'active' : ''}`} onClick={() => setTab('assistant')}>
          <Bot size={16} /> AI Support Assistant
        </button>
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
          <p>Loading customer portal...</p>
        </div>
      ) : (
        <main suppressHydrationWarning className="portal-content">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div suppressHydrationWarning className="dashboard-grid">
              <div suppressHydrationWarning className="portal-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Welcome, {user?.name || 'Customer'}</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Customer Account ID: <strong>{user?.accountId || 'Active'}</strong> · Email: {user?.email}</p>
                </div>
                <button className="button primary" onClick={() => setIsPlacingOrder(true)}>
                  <PlusCircle size={16} /> Place New Order
                </button>
              </div>

              {orders.length === 0 ? (
                <div suppressHydrationWarning className="portal-card empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Inbox size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>Welcome. Browse products to place your first order.</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto var(--s4)' }}>
                    Your account has no orders yet. Choose a product from the catalog to test the end-to-end delivery and dispute intelligence workflow.
                  </p>
                  <button className="button primary" onClick={() => setIsPlacingOrder(true)}>
                    <ShoppingBag size={16} /> Browse Product Catalog
                  </button>
                </div>
              ) : (
                <div suppressHydrationWarning className="two-column-layout">
                  {/* ORDERS LIST */}
                  <div suppressHydrationWarning className="portal-card">
                    <div suppressHydrationWarning className="section-title">
                      <h3>Recent Orders</h3>
                      <span className="badge neutral">{orders.length} Placed</span>
                    </div>
                    <div suppressHydrationWarning className="orders-list">
                      {orders.map(o => (
                        <div
                          key={o.id}
                          className={`order-item ${selectedCase === o.id ? 'active' : ''}`}
                          onClick={() => setSelectedCase(o.id)}
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
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTIVE ORDER DETAILS */}
                  {selectedOrder && (
                    <div suppressHydrationWarning className="portal-card">
                      <div suppressHydrationWarning className="section-title">
                        <h3>Order Status · {selectedOrder.id}</h3>
                        {!selectedOrder.status.includes('disputed') && (
                          <button 
                            className="button secondary small"
                            onClick={() => {
                              setDisputeOrderId(selectedOrder.id);
                              setIsCreatingDispute(true);
                            }}
                          >
                            <AlertTriangle size={14} /> Report Issue
                          </button>
                        )}
                      </div>

                      <div suppressHydrationWarning className="details-grid" style={{ marginBottom: 'var(--s4)' }}>
                        <div>
                          <label>Item</label>
                          <strong>{selectedOrder.item}</strong>
                        </div>
                        <div>
                          <label>Total Amount</label>
                          <strong>${selectedOrder.amount.toFixed(2)}</strong>
                        </div>
                        <div>
                          <label>Delivery Status</label>
                          <span className={`badge ${selectedOrder.deliveryStatus === 'DELIVERED' ? 'success' : 'neutral'}`}>
                            {selectedOrder.deliveryStatus || selectedOrder.status}
                          </span>
                        </div>
                        <div>
                          <label>Shipping Destination</label>
                          <small>{selectedOrder.deliveryAddress || 'Standard Address'}</small>
                        </div>
                      </div>

                      {selectedOrder.deliveryStatus === 'DELIVERED' && (
                        <div suppressHydrationWarning className="proof-box" style={{ background: 'var(--bg-elevated)', padding: 'var(--s3)', borderRadius: 'var(--rds-radius-md)', marginBottom: 'var(--s4)' }}>
                          <h4 style={{ color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={16} /> Order Delivered Successfully
                          </h4>
                          {selectedOrder.deliveryProof && (
                            <div style={{ marginTop: 8 }}>
                              <p>Courier Note: &ldquo;{selectedOrder.deliveryProof.note}&rdquo;</p>
                              {selectedOrder.deliveryProof.photoUrl && (
                                <img 
                                  src={selectedOrder.deliveryProof.photoUrl} 
                                  alt="Proof" 
                                  style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--rds-radius-sm)', marginTop: 8 }} 
                                />
                              )}
                            </div>
                          )}
                          {!selectedOrder.status.includes('disputed') && (
                            <button 
                              className="button primary small" 
                              style={{ marginTop: 12 }}
                              onClick={() => {
                                setDisputeOrderId(selectedOrder.id);
                                setIsCreatingDispute(true);
                              }}
                            >
                              I Didn&apos;t Receive This Order
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY ORDERS */}
          {tab === 'orders' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Product Catalog & My Orders</h2>
                  <p>Browse products, place orders, and track deliveries in real time.</p>
                </div>
                <button className="button primary" onClick={() => setIsPlacingOrder(true)}>
                  <PlusCircle size={16} /> Order New Item
                </button>
              </div>

              {orders.length === 0 ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Inbox size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Orders Found</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}>You have not placed any orders yet.</p>
                  <button className="button primary" onClick={() => setIsPlacingOrder(true)}>
                    Browse Products
                  </button>
                </div>
              ) : (
                <div suppressHydrationWarning className="orders-table-wrapper">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Item</th>
                        <th>Amount</th>
                        <th>Delivery Status</th>
                        <th>Courier</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{o.item}</td>
                          <td>${o.amount.toFixed(2)}</td>
                          <td>
                            <span className={`badge ${o.status.includes('disputed') ? 'danger' : o.deliveryStatus === 'DELIVERED' ? 'success' : 'neutral'}`}>
                              {o.deliveryStatus || o.status}
                            </span>
                          </td>
                          <td>{o.deliveryAgentName || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                          <td>
                            {o.deliveryStatus === 'DELIVERED' && !o.status.includes('disputed') ? (
                              <button 
                                className="button secondary small"
                                onClick={() => {
                                  setDisputeOrderId(o.id);
                                  setIsCreatingDispute(true);
                                }}
                              >
                                Dispute
                              </button>
                            ) : o.status.includes('disputed') ? (
                              <button 
                                className="button primary small"
                                onClick={() => {
                                  setSelectedCase(o.id);
                                  setTab('assistant');
                                }}
                              >
                                AI Chat
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Processing</span>
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

          {/* TAB 3: DISPUTES */}
          {tab === 'disputes' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>Active Disputes & Refund Investigations</h2>
                  <p>Cases submitted for evidence reconciliation and refund assessment.</p>
                </div>
              </div>

              {disputedOrders.length === 0 ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <ShieldCheck size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Active Disputes</h3>
                  <p style={{ color: 'var(--text-muted)' }}>All your delivered orders are in good standing.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="orders-table-wrapper">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Case / Order ID</th>
                        <th>Item</th>
                        <th>Amount</th>
                        <th>Case Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputedOrders.map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{o.item}</td>
                          <td>${o.amount.toFixed(2)}</td>
                          <td><span className="badge danger">Under Review</span></td>
                          <td>
                            <button 
                              className="button primary small"
                              onClick={() => {
                                setSelectedCase(o.id);
                                setTab('assistant');
                              }}
                            >
                              AI Support
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* TAB 4: AI ASSISTANT */}
          {tab === 'assistant' && (
            <section suppressHydrationWarning className="portal-card">
              <div suppressHydrationWarning className="section-title">
                <div>
                  <h2>AI Dispute Support Copilot</h2>
                  <p>Authorized customer dispute intelligence grounded in verified delivery records.</p>
                </div>
                {orders.length > 1 && (
                  <select 
                    value={selectedCase || ''} 
                    onChange={e => setSelectedCase(e.target.value)}
                    className="portal-select"
                  >
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        Order {o.id} ({o.item})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!selectedCase ? (
                <div suppressHydrationWarning className="empty-state" style={{ textAlign: 'center', padding: 'var(--s8) var(--s4)' }}>
                  <Bot size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--s3)' }} />
                  <h3>No Order Selected</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Place an order first or select an existing order to chat with AI Support.</p>
                </div>
              ) : (
                <div suppressHydrationWarning className="chat-interface-wrapper">
                  {/* CHAT MESSAGES */}
                  <div suppressHydrationWarning className="chat-messages-container" style={{ minHeight: 280, maxHeight: 420, overflowY: 'auto', padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--rds-radius-md)', marginBottom: 16 }}>
                    {chatHistory.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                        <Bot size={32} style={{ margin: '0 auto 8px', color: 'var(--brand-teal)' }} />
                        <p>Ask anything about order <strong>{selectedCase}</strong> (e.g. &ldquo;Why was it marked delivered?&rdquo; or &ldquo;Has my refund been initiated?&rdquo;)</p>
                      </div>
                    )}
                    {chatHistory.map(m => (
                      <div key={m.id} className={`chat-bubble ${m.role}`} style={{ margin: '10px 0', padding: 12, borderRadius: 'var(--rds-radius-md)', background: m.role === 'user' ? 'var(--brand-teal-dark)' : 'var(--bg-surface)' }}>
                        <strong>{m.role === 'user' ? 'You' : 'AI Assistant'}</strong>
                        <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                        {m.sources && m.sources.length > 0 && (
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                            Sources: {m.sources.join(', ')}
                          </small>
                        )}
                      </div>
                    ))}
                    {aiLoading && (
                      <div style={{ padding: 12, color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RotateCw size={14} className="spin" /> Analyzing case facts and evidence...
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* CHAT INPUT */}
                  <form onSubmit={handleAskAssistant} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Ask AI Support a question about this delivery..."
                      value={aiQuestion}
                      onChange={e => setAiQuestion(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="button primary" disabled={aiLoading || !aiQuestion.trim()}>
                      <Send size={14} /> Send
                    </button>
                  </form>

                  {/* EVIDENCE SUBMISSION */}
                  <div suppressHydrationWarning style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                    <h4>Provide Additional Case Evidence</h4>
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Add new statement (e.g. I spoke with security and they confirmed no dropoff)"
                        value={customerMessage}
                        onChange={e => setCustomerMessage(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="button secondary" disabled={sendingMsg || !customerMessage.trim()}>
                        {sendingMsg ? 'Indexing…' : 'Submit Evidence'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {/* PLACE ORDER MODAL */}
      {isPlacingOrder && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsPlacingOrder(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <h3>Place New Product Order</h3>
              <button className="icon-button" onClick={() => setIsPlacingOrder(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePlaceOrder}>
              <div suppressHydrationWarning className="form-group">
                <label>Select Product</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
                  {PRODUCTS.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      style={{
                        padding: 12,
                        borderRadius: 'var(--rds-radius-md)',
                        border: selectedProduct.id === p.id ? '2px solid var(--brand-teal)' : '1px solid var(--border-subtle)',
                        background: selectedProduct.id === p.id ? 'var(--brand-teal-dark)' : 'var(--bg-elevated)',
                        cursor: 'pointer'
                      }}
                    >
                      <strong>{p.name}</strong>
                      <div style={{ color: 'var(--brand-teal)', marginTop: 4 }}>${p.price.toFixed(2)}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{p.category}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div suppressHydrationWarning className="form-group" style={{ marginTop: 16 }}>
                <label>Shipping Address</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Enter delivery address"
                />
              </div>

              <div suppressHydrationWarning className="modal-actions" style={{ marginTop: 24 }}>
                <button type="button" className="button secondary" onClick={() => setIsPlacingOrder(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={placingOrder}>
                  {placingOrder ? 'Creating Order…' : `Place Order ($${selectedProduct.price.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {isCreatingDispute && (
        <div suppressHydrationWarning className="modal-backdrop" onClick={() => setIsCreatingDispute(false)}>
          <div suppressHydrationWarning className="modal-card" onClick={e => e.stopPropagation()}>
            <div suppressHydrationWarning className="modal-header">
              <h3>Report Delivery Issue · {disputeOrderId}</h3>
              <button className="icon-button" onClick={() => setIsCreatingDispute(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDispute}>
              <div suppressHydrationWarning className="form-group">
                <label>Problem Category</label>
                <select
                  value={disputeCategory}
                  onChange={e => setDisputeCategory(e.target.value as any)}
                  className="portal-select"
                >
                  <option value="not_received">I did not receive this order</option>
                  <option value="wrong_location">Delivered to wrong location / doorway</option>
                  <option value="incorrect_photo">Delivery photo does not match my building</option>
                  <option value="damaged">Package or item was damaged</option>
                  <option value="other">Other delivery problem</option>
                </select>
              </div>

              <div suppressHydrationWarning className="form-group">
                <label>Describe what happened</label>
                <textarea
                  rows={3}
                  required
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="Explain why you are disputing this delivery..."
                />
              </div>

              <div suppressHydrationWarning className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setIsCreatingDispute(false)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={submittingDispute}>
                  {submittingDispute ? 'Opening Case…' : 'Start AI Investigation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
