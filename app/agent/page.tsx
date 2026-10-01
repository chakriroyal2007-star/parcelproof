'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  ArrowUpRight, 
  Sparkles, 
  Clock3, 
  Check, 
  FileText, 
  MessageSquare, 
  Users, 
  BookOpen, 
  AlertTriangle, 
  ChevronRight, 
  RotateCw, 
  LockKeyhole, 
  X, 
  Truck, 
  Fingerprint, 
  CircleHelp, 
  CheckCheck, 
  Send, 
  ClipboardList,
  Bot,
  LogOut,
  Inbox
} from 'lucide-react';
import type { CaseData, Order, Source, User } from '@/lib/types';

const date = (s: string) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const money = (o: Order) => new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currency }).format(o.amount);

const QUICK_PROMPTS = [
  'Summarize this case',
  'What did the previous agent promise?',
  'Why is this delivery disputed?',
  'What evidence conflicts?',
  'Is the refund overdue?',
  'What information is missing?',
  'What should I do next?',
  'Draft a customer response',
  'Show me the sources'
];

export default function AgentPortal() {
  const router = useRouter();
    const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState('PP-1042');
  const [data, setData] = useState<CaseData | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'inbox' | 'workspace' | 'handoffs'>('workspace');
  const [tab, setTab] = useState('overview');
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);
  const requestVersion = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || (d.user.role !== 'AGENT' && d.user.role !== 'ADMIN')) {
          // Auto-login as Priya Shah demo agent
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'priya@parcelproof.com', password: 'password123' })
          })
            .then(r => r.json())
            .then(authData => setCurrentUser(authData.user));
        } else {
          setCurrentUser(d.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(d => setOrders(d.orders))
      .catch(() => setError('Could not load cases.'));
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    setData(null);
    setError('');
    setNotice('');
    fetch('/api/cases/' + selected)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (version === requestVersion.current) {
          setData(d);
          setDraft(d.draft);
        }
      })
      .catch(e => setError(e.message));
  }, [selected]);

  useEffect(() => {
    if (tab === 'copilot') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tab, data?.chatHistory]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function run(operation: string, extra: Record<string, unknown> = {}) {
    setBusy(operation);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/cases/' + selected, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, ...extra })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d.case);
      setDraft(d.case.draft);
      setNotice(
        operation === 'approve'
          ? (d.result?.duplicate ? 'Existing action found. No duplicate was created.' : 'Simulated action recorded. Promise Ledger and handoff updated.')
          : operation === 'switch'
          ? `You’re now ${d.case.activeAgent}. The saved handoff is ready.`
          : operation === 'analyze'
          ? 'Evidence reconciled. Review the recommendation before approval.'
          : operation === 'reply' || operation === 'draft_ai'
          ? 'Draft generated for agent review. Nothing has been sent.'
          : operation === 'draft'
          ? 'Edited draft saved. Nothing has been sent.'
          : operation === 'clear_chat'
          ? 'Conversation history reset for this case.'
          : 'Handoff saved for the next shift.'
      );
      if (operation === 'switch') setTab('handoff');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy('');
    }
  }

  async function sendChatMessage(promptText: string) {
    if (!promptText.trim() || isChatting) return;
    setIsChatting(true);
    setError('');
    try {
      const r = await fetch('/api/cases/' + selected + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptText.trim() })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d.case);
      setChatInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat query failed.');
    } finally {
      setIsChatting(false);
    }
  }

  function inspect(id: string) {
    const found = [...(data?.sources || []), ...(data?.accountContext || [])].find(s => s.id === id);
    if (found) {
      setSource(found);
      dialog.current?.showModal();
    } else {
      setError('This source is no longer available. Analyze again.');
    }
  }

  const cites = (ids: string[]) => (
    <span className="citations">
      {ids.map(id => (
        <button key={id} className="cite" onClick={() => inspect(id)} title={'Inspect ' + id}>
          {id}
          <ArrowUpRight size={12} />
        </button>
      ))}
    </span>
  );

  const a = data?.analysis;
  const o = data?.order;
  const risks = data?.riskSignals || [];
  const commitments = data?.commitments || [];
  const chatHistory = data?.chatHistory || [];
  const brief = data?.brief;

  return (
    <div suppressHydrationWarning className="portal-shell">
      {/* HEADER */}
      <header suppressHydrationWarning className="portal-header">
        <div suppressHydrationWarning className="brand">
          <span className="brand-icon"><Package size={22} /></span>
          Parcel<span>Proof</span> <small style={{ marginLeft: 'var(--s2)', opacity: 0.7 }}>Agent Workspace</small>
        </div>
        <div suppressHydrationWarning className="portal-user-bar">
          <span className="badge neutral">Active Agent: <strong>{data?.activeAgent || currentUser?.name || 'Priya Shah'}</strong></span>
          <span className="badge neutral">{data?.mode === 'live' ? 'Live OpenAI RAG' : 'Grounded Fixture Engine'}</span>
          <button className="button secondary icon-only" onClick={handleLogout} title="Sign out">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* TOP NAVIGATION */}
      <nav suppressHydrationWarning className="portal-nav">
        <button
          className={`portal-nav-btn ${view === 'inbox' ? 'active' : ''}`}
          onClick={() => setView('inbox')}
        >
          <Inbox size={15} style={{ marginRight: '6px' }} /> Dispute Inbox ({orders.length})
        </button>
        <button
          className={`portal-nav-btn ${view === 'workspace' ? 'active' : ''}`}
          onClick={() => setView('workspace')}
        >
          <FileText size={15} style={{ marginRight: '6px' }} /> Case Workspace ({selected})
        </button>
        <button
          className={`portal-nav-btn ${view === 'handoffs' ? 'active' : ''}`}
          onClick={() => { setView('workspace'); setTab('handoff'); }}
        >
          <ClipboardList size={15} style={{ marginRight: '6px' }} /> Shift Handoff
        </button>
      </nav>

      {/* INBOX VIEW */}
      {view === 'inbox' && (
        <main suppressHydrationWarning className="portal-content">
          <section suppressHydrationWarning className="portal-card">
            <div suppressHydrationWarning className="section-title">
              <div>
                <h2>Agent Dispute Queue</h2>
                <p>Prioritized by AI risk indicators, broken commitments, and conflicting courier evidence.</p>
              </div>
            </div>

            <div suppressHydrationWarning className="orders-table-wrapper">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Customer</th>
                    <th>Item & Value</th>
                    <th>Dispute Status</th>
                    <th>AI Risk Signal</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(item => (
                    <tr key={item.id} className={selected === item.id ? 'highlight-row' : ''}>
                      <td><strong>{item.id}</strong></td>
                      <td>{item.speaker}</td>
                      <td>{item.item} ({item.currency} {item.amount})</td>
                      <td>
                        <span className={`badge ${item.status.includes('disputed') ? 'warning' : 'neutral'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.id === 'PP-1042' && <span className="risk-badge high">⚠ Refund Overdue</span>}
                        {item.id === 'PP-1043' && <span className="risk-badge medium">Existing Refund</span>}
                        {item.id === 'PP-1044' && <span className="risk-badge medium">Shared Household</span>}
                        {item.id === 'PP-1045' && <span className="risk-badge high">Missing Scan & Policy</span>}
                      </td>
                      <td>
                        <button
                          className="button primary"
                          style={{ padding: '4px 10px', fontSize: 'var(--xs)' }}
                          onClick={() => { setSelected(item.id); setView('workspace'); }}
                        >
                          Open Case →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* WORKSPACE VIEW */}
      {view === 'workspace' && (
        <div suppressHydrationWarning className="page-shell" style={{ padding: 0 }}>
          <nav suppressHydrationWarning className="case-picker" aria-label="Demo cases" style={{ margin: 'var(--s4) var(--s8) var(--s6)' }}>
            {orders.map((item, index) => (
              <button
                disabled={!!busy || isChatting}
                className={'case-choice ' + (selected === item.id ? 'selected' : '')}
                key={item.id}
                onClick={() => setSelected(item.id)}
              >
                <span className="case-number">0{index + 1}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.id}</small>
                </span>
                {selected === item.id ? <ArrowRight size={18} /> : <ChevronRight size={16} />}
              </button>
            ))}
          </nav>

          {error && (
            <div suppressHydrationWarning className="message error" role="alert" style={{ margin: '0 var(--s8) var(--s4)' }}>
              <AlertTriangle size={18} /> {error}
              <button onClick={() => location.reload()}>Reload</button>
            </div>
          )}
          {notice && (
            <div suppressHydrationWarning className="message success" role="status" style={{ margin: '0 var(--s8) var(--s4)' }}>
              <Check size={18} /> {notice}
            </div>
          )}

          {!data ? (
            <div suppressHydrationWarning className="loading" style={{ padding: 'var(--s12)' }}>
              <RotateCw className="spin" /> Loading case records…
            </div>
          ) : (
            <>
              <header suppressHydrationWarning className="case-header" style={{ padding: '0 var(--s8) var(--s4)' }}>
                <div suppressHydrationWarning className="case-title">
                  <span className="package-tile"><Package size={28} /></span>
                  <div>
                    <div suppressHydrationWarning className="flexline">
                      <h2>{o!.id}</h2>
                      <span className="badge warning">{o!.status}</span>
                    </div>
                    <p>{o!.item} <span className="muted">· {money(o!)}</span></p>
                  </div>
                </div>
                <div suppressHydrationWarning className="header-actions">
                  <button className="button secondary" disabled={!!busy || !a} onClick={() => run('switch')}>
                    <Users size={16} /> Switch agent
                  </button>
                  <button className="button primary" disabled={!!busy} onClick={() => run('analyze')}>
                    <Sparkles size={17} />
                    {busy === 'analyze' ? 'Reconciling evidence…' : a ? 'Re-analyze case' : 'Analyze case'}
                  </button>
                </div>
              </header>

              <div suppressHydrationWarning className="context-grid" style={{ padding: 'var(--s2) var(--s8) var(--s5)' }}>
                <div>
                  <span>Current speaker</span>
                  <strong>{o!.speaker}</strong>
                </div>
                <div>
                  <span>Intended recipient</span>
                  <strong>{o!.recipient}</strong>
                </div>
                <div>
                  <span>Recipient verification</span>
                  <strong className={o!.verified ? 'good' : 'warn'}>
                    {o!.verified ? <ShieldCheck size={15} /> : <Fingerprint size={15} />}
                    {o!.verified ? 'Verified · synthetic record' : 'Not verified'}
                  </strong>
                </div>
                <div>
                  <span>Current agent</span>
                  <strong>{data.activeAgent}</strong>
                </div>
              </div>

              <div suppressHydrationWarning className="color-strip" aria-hidden="true" />

              <main suppressHydrationWarning className="workspace">
                <div suppressHydrationWarning className="workspace-top">
                  <nav suppressHydrationWarning className="tabs" aria-label="Case sections">
                    {[
                      ['overview', 'Case overview'],
                      ['copilot', 'ParcelProof AI Copilot'],
                      ['evidence', 'Supporting evidence'],
                      ['handoff', 'Shift handoff']
                    ].map(([key, label]) => (
                      <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                        {label}
                        {key === 'copilot' && <Sparkles size={14} />}
                        {key === 'evidence' && <span>{a?.evidence.length || data.sources.length}</span>}
                        {key === 'handoff' && data.handoff && <Check size={14} />}
                      </button>
                    ))}
                  </nav>
                  <span className="scope">
                    <LockKeyhole size={13} /> {o!.id} strictly scoped
                  </span>
                </div>

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                  <div suppressHydrationWarning className="overview-grid">
                    <div suppressHydrationWarning className="main-column">
                      {a ? (
                        <section suppressHydrationWarning className={'insight ' + (data.refund.status === 'initiated' ? 'resolved' : '')}>
                          <div suppressHydrationWarning className="insight-label">
                            <Sparkles size={16} /> The thread that was missing
                          </div>
                          <h2>{a.narrative.headline.text}</h2>
                          <p>Promises and payment records, finally in the same conversation.</p>
                          {cites(a.narrative.headline.sourceIds)}
                        </section>
                      ) : (
                        <section suppressHydrationWarning className="insight">
                          <div suppressHydrationWarning className="insight-label">
                            <Sparkles size={16} /> One case. The whole story.
                          </div>
                          <h2>The customer shouldn’t have to start over.</h2>
                          <p>Analyze this case to connect courier evidence, prior promises and the current refund ledger.</p>
                        </section>
                      )}

                      {risks.length > 0 && (
                        <div suppressHydrationWarning className="risk-signals-container">
                          <div suppressHydrationWarning className="risk-signals-header">
                            <AlertTriangle size={14} /> Risk Signals Detected ({risks.length})
                          </div>
                          <div suppressHydrationWarning className="risk-signals-list">
                            {risks.map(r => (
                              <span key={r.id} className={`risk-badge ${r.level}`} title={r.detail}>
                                <AlertTriangle size={12} /> {r.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <section suppressHydrationWarning className="section">
                        <div suppressHydrationWarning className="section-title">
                          <div>
                            <h2>Promise Ledger</h2>
                            <p>A commitment is a responsibility, not a refund authorization.</p>
                          </div>
                          <Clock3 size={19} />
                        </div>
                        {!a ? (
                          <div suppressHydrationWarning className="empty-inline">Analyze the case to extract and reconcile earlier commitments.</div>
                        ) : a.promises.length ? (
                          a.promises.map((p, i) => (
                            <article className="promise-card" key={i}>
                              <div suppressHydrationWarning className="flexline between">
                                <span className={'badge ' + (p.status === 'fulfilled' ? 'success' : 'danger')}>
                                  {p.status === 'overdue' ? <Clock3 size={13} /> : <CheckCheck size={13} />} {p.status}
                                </span>
                                <small>Agent commitment</small>
                              </div>
                              <blockquote>“{p.quote}”</blockquote>
                              <div suppressHydrationWarning className="promise-details">
                                <span>
                                  <strong>{p.speaker}</strong>
                                  <small>Made {date(p.madeAt)}</small>
                                </span>
                                <span>
                                  <strong>{p.deadline ? 'Due ' + date(p.deadline) : 'Deadline not stated'}</strong>
                                  <small>
                                    {p.status === 'fulfilled'
                                      ? 'Initiation recorded · payment not confirmed'
                                      : 'No supporting initiation recorded'}
                                  </small>
                                </span>
                              </div>
                              {cites([...p.sourceIds, ...(p.actionRecord ? [p.actionRecord] : [])])}
                            </article>
                          ))
                        ) : (
                          <div suppressHydrationWarning className="empty-inline">
                            <Check size={16} /> No agent commitment found in this order’s conversations.
                          </div>
                        )}
                      </section>

                      <section suppressHydrationWarning className="section">
                        <div suppressHydrationWarning className="section-title">
                          <div>
                            <h2>Where the stories diverge</h2>
                            <p>Reported claims stay separate from verified facts.</p>
                          </div>
                          <AlertTriangle size={19} />
                        </div>
                        {!a ? (
                          <div suppressHydrationWarning className="empty-inline">Reconciliation appears after analysis.</div>
                        ) : a.narrative.conflicts.length ? (
                          a.narrative.conflicts.map((c, i) => (
                            <article className="conflict" key={i}>
                              <h3>{c.title}</h3>
                              <div suppressHydrationWarning className="claim-grid">
                                <div>
                                  <span className="eyebrow"><Truck size={14} /> Courier reports</span>
                                  <p>{c.reported.text}</p>
                                  {cites(c.reported.sourceIds)}
                                </div>
                                <div>
                                  <span className="eyebrow"><MessageSquare size={14} /> Customer disputes</span>
                                  <p>{c.disputed.text}</p>
                                  {cites(c.disputed.sourceIds)}
                                </div>
                              </div>
                              <div suppressHydrationWarning className="unknown">
                                <CircleHelp size={16} />
                                <span>{c.resolution.text} {cites(c.resolution.sourceIds)}</span>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div suppressHydrationWarning className="empty-inline">
                            <CircleHelp size={16} /> No direct contradiction extracted.
                          </div>
                        )}
                      </section>

                      <section suppressHydrationWarning className="section">
                        <div suppressHydrationWarning className="section-title">
                          <div>
                            <h2>The story so far</h2>
                            <p>Original records preserved across shifts.</p>
                          </div>
                          <button className="text-button" onClick={() => setTab('evidence')}>
                            View evidence <ArrowRight size={14} />
                          </button>
                        </div>
                        <div suppressHydrationWarning className="timeline">
                          {data.sources
                            .filter(s => s.orderId === selected && ['support', 'courier', 'action'].includes(s.type))
                            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                            .map(s => (
                              <div suppressHydrationWarning className="timeline-item" key={s.id}>
                                <span className={'timeline-icon ' + s.type}>
                                  {s.type === 'courier' ? <Truck size={16} /> : s.type === 'action' ? <Check size={16} /> : <MessageSquare size={16} />}
                                </span>
                                <div>
                                  <small>{date(s.timestamp)} · {s.type === 'action' ? 'Simulated action' : s.type}</small>
                                  <button className="timeline-title" onClick={() => inspect(s.id)}>
                                    {s.title} <ArrowUpRight size={14} />
                                  </button>
                                  <p>{s.type === 'action' ? data.audits.find(x => x.id === s.id)?.detail : s.text.split('\n')[0]}</p>
                                  {cites([s.id])}
                                </div>
                              </div>
                            ))}
                        </div>
                      </section>
                    </div>

                    <aside className="action-column" aria-label="Recommended next action">
                      <section suppressHydrationWarning className="ledger-status">
                        <span className="eyebrow">Refund ledger · direct database record</span>
                        <div suppressHydrationWarning className="flexline between">
                          <h3>{data.refund.status === 'initiated' ? 'Initiation recorded' : 'Not initiated'}</h3>
                          <span className={'status-icon ' + (data.refund.status === 'initiated' ? 'good' : 'warn')}>
                            {data.refund.status === 'initiated' ? <Check size={23} /> : <Clock3 size={23} />}
                          </span>
                        </div>
                        <p>
                          {data.refund.status === 'initiated'
                            ? 'No payment completion confirmed. Duplicate initiation blocked.'
                            : 'No refund action is recorded for this order.'}
                        </p>
                        {cites(['REF-' + selected])}
                      </section>

                      <section suppressHydrationWarning className="recommendation">
                        <div suppressHydrationWarning className="section-title">
                          <h2>Next justified action</h2>
                          <ShieldCheck size={19} />
                        </div>
                        {a ? (
                          <>
                            <span className={'badge ' + (a.gate.eligible ? 'success' : 'warning')}>
                              {a.gate.eligible ? 'Policy prerequisites met' : a.gate.action === 'review_refund' ? 'Duplicate protection active' : 'More evidence needed'}
                            </span>
                            <h3>{a.narrative.recommendation.title}</h3>
                            <div suppressHydrationWarning className="rationale">
                              {a.narrative.recommendation.rationale.map((r, i) => (
                                <p key={i}>{r.text}{cites(r.sourceIds)}</p>
                              ))}
                            </div>
                            {a.gate.missing.length > 0 && (
                              <div suppressHydrationWarning className="missing">
                                <strong>Missing prerequisites</strong>
                                <ul>
                                  {a.gate.missing.map(m => (
                                    <li key={m}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div suppressHydrationWarning className="owner">
                              <Users size={15} />
                              <span>Owner: {a.narrative.recommendation.owner}</span>
                            </div>
                            <button
                              className="button primary full"
                              disabled={!!busy}
                              onClick={() => run('approve', { key: crypto.randomUUID(), analysisId: a.id })}
                            >
                              <Check size={16} />
                              {busy === 'approve'
                                ? 'Recording…'
                                : a.gate.action === 'initiate_refund'
                                ? `Approve simulated refund · ${money(o!)}`
                                : a.gate.action === 'review_refund'
                                ? 'Approve simulated status review'
                                : 'Approve simulated escalation'}
                            </button>
                            <small className="approval-note">Your click approves this simulated action. No money moves.</small>
                          </>
                        ) : (
                          <div suppressHydrationWarning className="empty-recommendation">
                            <ShieldCheck size={32} />
                            <p>Evidence first.<br />Then the right next step.</p>
                            <small>Analyze to check policy eligibility.</small>
                          </div>
                        )}
                      </section>

                      <section suppressHydrationWarning className="reply-section">
                        <div suppressHydrationWarning className="section-title">
                          <h2>Customer reply</h2>
                          <MessageSquare size={18} />
                        </div>
                        <button className="text-button" disabled={!!busy} onClick={() => run('reply')}>
                          <Sparkles size={15} /> {busy === 'reply' ? 'Drafting…' : 'Generate reply'}
                        </button>
                        {draft && (
                          <>
                            <textarea id="draft" value={draft} onChange={e => setDraft(e.target.value)} rows={9} />
                            <div suppressHydrationWarning className="draft-footer">
                              <small>Agent-editable · never sent automatically</small>
                              <button className="button secondary" disabled={!!busy} onClick={() => run('draft', { text: draft })}>
                                Save draft
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    </aside>
                  </div>
                )}

                {/* COPILOT TAB */}
                {tab === 'copilot' && (
                  <section suppressHydrationWarning className="copilot-page">
                    <header suppressHydrationWarning className="copilot-header">
                      <div suppressHydrationWarning className="copilot-title">
                        <Bot size={28} className="text-accent" />
                        <div>
                          <h2>ParcelProof AI</h2>
                          <p>Evidence-grounded case copilot · Multi-turn conversational memory</p>
                        </div>
                      </div>
                      <div suppressHydrationWarning className="copilot-status-bar">
                        <span className="badge neutral"><LockKeyhole size={12} /> Scoped to {selected}</span>
                        <span className="badge success"><Check size={12} /> {data.sources.length} Evidence Sources</span>
                        <button className="button secondary" disabled={busy === 'clear_chat'} onClick={() => run('clear_chat')}>
                          Clear Chat
                        </button>
                      </div>
                    </header>

                    <div suppressHydrationWarning className="quick-actions-bar">
                      <span className="quick-actions-title">Suggested Quick Questions</span>
                      <div suppressHydrationWarning className="quick-actions-chips">
                        {QUICK_PROMPTS.map(p => (
                          <button
                            key={p}
                            className="quick-chip"
                            disabled={isChatting}
                            onClick={() => sendChatMessage(p)}
                          >
                            <Sparkles size={13} /> {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div suppressHydrationWarning className="copilot-chat-container">
                      <div suppressHydrationWarning className="chat-thread">
                        {chatHistory.length === 0 ? (
                          <div suppressHydrationWarning className="empty-inline">
                            <Bot size={20} />
                            <span>Ask ParcelProof AI anything about case <strong>{selected}</strong>.</span>
                          </div>
                        ) : (
                          chatHistory.map(msg => (
                            <div key={msg.id} className={`chat-message ${msg.role}`}>
                              {msg.role === 'user' ? (
                                <div suppressHydrationWarning className="chat-bubble-user">{msg.content}</div>
                              ) : (
                                <article className="chat-card-assistant">
                                  <div suppressHydrationWarning className="chat-assistant-header">
                                    <div suppressHydrationWarning className="chat-assistant-meta">
                                      <Sparkles size={14} className="text-accent" />
                                      <strong>ParcelProof AI</strong> · {date(msg.timestamp)}
                                    </div>
                                    {msg.confidence !== undefined && (
                                      <span className="badge success">
                                        <ShieldCheck size={12} /> {Math.round(msg.confidence * 100)}% Grounded
                                      </span>
                                    )}
                                  </div>
                                  <div suppressHydrationWarning className="chat-answer-text">{msg.content}</div>
                                  {msg.sources && msg.sources.length > 0 && <div>{cites(msg.sources)}</div>}
                                </article>
                              )}
                            </div>
                          ))
                        )}
                        {isChatting && (
                          <div suppressHydrationWarning className="chat-message assistant">
                            <div suppressHydrationWarning className="chat-card-assistant">
                              <div suppressHydrationWarning className="loading"><RotateCw className="spin" /> Synthesizing grounded reasoning…</div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <form suppressHydrationWarning
                        className="chat-input-wrapper"
                        onSubmit={e => { e.preventDefault(); sendChatMessage(chatInput); }}
                      >
                        <input
                          type="text"
                          className="chat-input"
                          placeholder={`Ask anything about case ${selected}...`}
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          disabled={isChatting}
                        />
                        <button type="submit" className="button primary" disabled={!chatInput.trim() || isChatting}>
                          <Send size={15} /> Send
                        </button>
                      </form>
                    </div>
                  </section>
                )}

                {/* EVIDENCE TAB */}
                {tab === 'evidence' && (
                  <section suppressHydrationWarning className="evidence-page">
                    <div suppressHydrationWarning className="section-title">
                      <div>
                        <h2>Inspect the evidence</h2>
                        <p>{a ? `${a.evidence.length} passages used` : 'Original scoped records.'}</p>
                      </div>
                      <span className="badge neutral"><LockKeyhole size={13} /> {selected}</span>
                    </div>
                    <div suppressHydrationWarning className="evidence-grid">
                      {(a ? a.evidence : data.sources.map(s => ({ chunkId: s.id, source: s, passage: s.text, method: 'Original record' }))).map(p => (
                        <article className="evidence-card" key={p.chunkId}>
                          <div suppressHydrationWarning className="flexline between">
                            <span className="badge neutral">{p.source.type} {p.source.version && '· v' + p.source.version}</span>
                            <span className="synthetic-label">Synthetic</span>
                          </div>
                          <h3>{p.source.title}</h3>
                          <small>{date(p.source.timestamp)} · {p.source.orderId || 'Applicable policy'}</small>
                          <p className="passage">{p.passage}</p>
                          {p.source.photo && (
                            <figure>
                              <img src={p.source.photo} alt="Delivery evidence" />
                              <figcaption>Simulated courier upload</figcaption>
                            </figure>
                          )}
                          <div suppressHydrationWarning className="evidence-footer">
                            {cites([p.source.id])}
                            <small>{p.method}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {/* HANDOFF TAB */}
                {tab === 'handoff' && (
                  <section suppressHydrationWarning className="handoff-page">
                    <div suppressHydrationWarning className="section-title">
                      <div>
                        <h2>A new agent. The same memory.</h2>
                        <p>Carry the promises, disputes and completed steps into the next shift.</p>
                      </div>
                      <button className="button primary" disabled={!!busy} onClick={() => run('handoff')}>
                        <ClipboardList size={16} /> Save handoff
                      </button>
                    </div>

                    {brief && (
                      <article className="next-agent-brief-card">
                        <div suppressHydrationWarning className="brief-header">
                          <div>
                            <span className="eyebrow"><Sparkles size={14} /> AI Generated Brief</span>
                            <h3>Next Agent Brief · Case {brief.caseId}</h3>
                          </div>
                          <span className="badge neutral">Prepared for {data.activeAgent}</span>
                        </div>
                        <div suppressHydrationWarning className="brief-section">
                          <h4>Customer Issue</h4>
                          <p>{brief.customerIssue}</p>
                        </div>
                        <div suppressHydrationWarning className="brief-section">
                          <h4>Important Verified Information</h4>
                          <ul>
                            {brief.verifiedInformation.map((info, i) => (
                              <li key={i}>{info}</li>
                            ))}
                          </ul>
                        </div>
                        <div suppressHydrationWarning className="brief-section">
                          <h4>Previous Commitment</h4>
                          <p>{brief.previousCommitment}</p>
                        </div>
                        <div suppressHydrationWarning className="brief-section">
                          <h4>Unresolved Conflict</h4>
                          <p>{brief.unresolvedConflict}</p>
                        </div>
                        <div suppressHydrationWarning className="brief-section">
                          <h4>Next Action</h4>
                          <p>{brief.nextAction}</p>
                        </div>
                        <div>{cites(brief.sourceIds)}</div>
                      </article>
                    )}

                    <div suppressHydrationWarning className="handoff-grid" style={{ marginTop: 'var(--s6)' }}>
                      <article className="handoff-card">
                        <div suppressHydrationWarning className="flexline between">
                          <span className="badge success">{data.handoff ? 'Persisted in SQLite' : 'No saved handoff yet'}</span>
                          <BookOpen size={22} />
                        </div>
                        <h3>{data.handoff ? `Ready for ${data.activeAgent}` : 'Don’t make them explain it again.'}</h3>
                        {data.handoff && (
                          <ul className="handoff-list">
                            {data.handoff.summary.map((s, i) => (
                              <li key={i}>
                                <Check size={16} />
                                <div>{s.text}{cites(s.sourceIds)}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>

                      <article className="audit-card">
                        <h3>Action trail</h3>
                        <p>Agent-approved, simulated and auditable.</p>
                        {data.audits.length ? (
                          data.audits.map(event => (
                            <div suppressHydrationWarning className="audit-event" key={event.id}>
                              <span className="badge neutral">{event.kind.replaceAll('_', ' ')}</span>
                              <p>{event.detail}</p>
                              <small>{event.agent} · {date(event.at)}</small>
                              {cites([event.id])}
                            </div>
                          ))
                        ) : (
                          <div suppressHydrationWarning className="empty-inline">No actions approved yet.</div>
                        )}
                      </article>
                    </div>
                  </section>
                )}
              </main>
            </>
          )}
        </div>
      )}

      {/* SOURCE DIALOG */}
      <dialog
        ref={dialog}
        className="source-dialog"
        onClick={e => { if (e.target === dialog.current) dialog.current?.close(); }}
      >
        <div suppressHydrationWarning className="dialog-heading">
          <span className="eyebrow">Original source · synthetic</span>
          <button className="icon-button" onClick={() => dialog.current?.close()}><X size={21} /></button>
        </div>
        {source && (
          <>
            <h2>{source.title}</h2>
            <div suppressHydrationWarning className="source-meta">
              <span>{source.id}</span>
              <span>{source.orderId || 'Account / policy context'}</span>
              <span>{date(source.timestamp)}</span>
            </div>
            <pre className="source-text">
              {['order', 'refund', 'action'].includes(source.type) ? JSON.stringify(JSON.parse(source.text), null, 2) : source.text}
            </pre>
          </>
        )}
      </dialog>
    </div>
  );
}
