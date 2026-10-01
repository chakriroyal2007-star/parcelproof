'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShieldCheck, ArrowRight, Lock, User, AlertCircle, ShoppingBag, Briefcase, Truck, Headset, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@parcelproof.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e?: React.FormEvent, customEmail?: string) {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.user.role === 'CUSTOMER') {
        router.push('/customer');
      } else if (data.user.role === 'OWNER') {
        router.push('/owner');
      } else if (data.user.role === 'DELIVERY_AGENT') {
        router.push('/delivery');
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/agent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    handleLogin(undefined, demoEmail);
  }

  return (
    <div suppressHydrationWarning className="login-shell">
      <div suppressHydrationWarning className="login-card" style={{ maxWidth: 640 }}>
        <div suppressHydrationWarning className="login-header">
          <div suppressHydrationWarning className="brand" style={{ justifyContent: 'center', marginBottom: 'var(--s3)' }}>
            <span className="brand-icon"><Package size={26} /></span>
            Parcel<span>Proof</span>
          </div>
          <h2>Delivery Lifecycle & Dispute Intelligence</h2>
          <p style={{ color: 'var(--text-dim)' }}>
            Delivered is a status. Proof is a story. End-to-end evidence reconciliation, deterministic refund scoring, and human-in-the-loop decisions.
          </p>
        </div>

        {error && (
          <div suppressHydrationWarning className="message error" role="alert" style={{ margin: 'var(--s3) 0' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form suppressHydrationWarning onSubmit={handleLogin} className="login-form">
          <div suppressHydrationWarning className="form-group">
            <label htmlFor="email">Work Email / Customer Account</label>
            <div suppressHydrationWarning className="input-with-icon">
              <User size={16} />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div suppressHydrationWarning className="form-group">
            <label htmlFor="password">Password</label>
            <div suppressHydrationWarning className="input-with-icon">
              <Lock size={16} />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" className="button primary full" disabled={loading}>
            {loading ? 'Authenticating…' : 'Sign in to ParcelProof'} <ArrowRight size={16} />
          </button>
        </form>

        <div suppressHydrationWarning className="demo-accounts-box" style={{ marginTop: 'var(--s4)', padding: 'var(--s4)', background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <span className="demo-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', display: 'block', marginBottom: 'var(--s3)' }}>
            ⚡ Nimbus Hackathon 1-Click Role Logins:
          </span>
          <div suppressHydrationWarning className="demo-buttons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s2)' }}>
            <button type="button" onClick={() => quickLogin('owner@parcelproof.com')} className="demo-btn" style={{ textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-teal)' }}>
                <Briefcase size={14} /> <strong>Owner / Operations</strong>
              </div>
              <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Elena Vance (Assign & Review)</small>
            </button>

            <button type="button" onClick={() => quickLogin('alex@example.com')} className="demo-btn" style={{ textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-orange)' }}>
                <ShoppingBag size={14} /> <strong>Customer Portal</strong>
              </div>
              <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Alex Morgan (Place & Dispute)</small>
            </button>

            <button type="button" onClick={() => quickLogin('courier@parcelproof.com')} className="demo-btn" style={{ textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6' }}>
                <Truck size={14} /> <strong>Delivery Agent</strong>
              </div>
              <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Daniel Kumar (Proof & Dropoff)</small>
            </button>

            <button type="button" onClick={() => quickLogin('priya@parcelproof.com')} className="demo-btn" style={{ textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a855f7' }}>
                <Headset size={14} /> <strong>Support Copilot</strong>
              </div>
              <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Priya Shah (Live RAG Copilot)</small>
            </button>

            <button type="button" onClick={() => quickLogin('admin@parcelproof.com')} className="demo-btn" style={{ textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--surface-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e' }}>
                <Shield size={14} /> <strong>Admin Console</strong>
              </div>
              <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: 2 }}>Sarah Connor (System Audit)</small>
            </button>
          </div>
        </div>

        <div suppressHydrationWarning className="login-footer" style={{ marginTop: 'var(--s4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          <ShieldCheck size={14} />
          <span>Multi-Role Access Control · SQLite Database · Grounded RAG + LLM</span>
        </div>
      </div>
    </div>
  );
}
