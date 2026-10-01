'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShieldCheck, ArrowRight, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('priya@parcelproof.com');
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
      <div suppressHydrationWarning className="login-card">
        <div suppressHydrationWarning className="login-header">
          <div suppressHydrationWarning className="brand" style={{ justifyContent: 'center', marginBottom: 'var(--s3)' }}>
            <span className="brand-icon"><Package size={26} /></span>
            Parcel<span>Proof</span>
          </div>
          <h2>Evidence-Driven Delivery Dispute Resolution</h2>
          <p>Reconstruct disputes across conversations, courier evidence, and verified commitments.</p>
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

        <div suppressHydrationWarning className="demo-accounts-box">
          <span className="demo-title">⚡ Hackathon Demo Quick Access:</span>
          <div suppressHydrationWarning className="demo-buttons-grid">
            <button type="button" onClick={() => quickLogin('alex@example.com')} className="demo-btn">
              <strong>Customer Portal</strong>
              <small>Alex Morgan (Case PP-1042)</small>
            </button>
            <button type="button" onClick={() => quickLogin('priya@parcelproof.com')} className="demo-btn">
              <strong>Agent Workspace</strong>
              <small>Priya Shah (Dispute Copilot)</small>
            </button>
            <button type="button" onClick={() => quickLogin('daniel@parcelproof.com')} className="demo-btn">
              <strong>Agent Workspace</strong>
              <small>Daniel Kim (Shift Handoff)</small>
            </button>
            <button type="button" onClick={() => quickLogin('admin@parcelproof.com')} className="demo-btn">
              <strong>Admin Console</strong>
              <small>Sarah Connor (Audits & Policies)</small>
            </button>
          </div>
        </div>

        <div suppressHydrationWarning className="login-footer">
          <ShieldCheck size={14} />
          <span>Role-based access control · Persistent SQLite case memory</span>
        </div>
      </div>
    </div>
  );
}
