'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  ShoppingBag, 
  Briefcase, 
  Truck, 
  Shield, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoPersonas = [
    {
      role: 'CUSTOMER' as UserRole,
      name: 'Alex Morgan',
      email: 'alex@example.com',
      badge: 'Disputed Order PP-1042',
      desc: 'Consumer portal to track orders, file disputes, and chat with AI assistant.'
    },
    {
      role: 'OWNER' as UserRole,
      name: 'Elena Vance',
      email: 'owner@parcelproof.com',
      badge: 'Operations Lead',
      desc: 'Operations workspace to review cases, assign couriers, and approve refunds.'
    },
    {
      role: 'DELIVERY_AGENT' as UserRole,
      name: 'Daniel Kumar',
      email: 'courier@parcelproof.com',
      badge: 'Single Courier',
      desc: 'Courier interface to view assignments, update delivery states, and upload proof.'
    },
    {
      role: 'ADMIN' as UserRole,
      name: 'Sarah Connor',
      email: 'admin@parcelproof.com',
      badge: 'System Audit',
      desc: 'Audit and governance console with system metrics and RAG inspection.'
    }
  ];

  function selectPersona(p: typeof demoPersonas[0]) {
    setSelectedRole(p.role);
    setName(p.name);
    setEmail(p.email);
    setError('');
  }

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          name: name.trim(), 
          role: selectedRole,
          password: 'password123' 
        })
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ParcelProof Unified Identity & Authentication</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <Package className="w-8 h-8 text-indigo-400" />
            <span>Parcel<span className="text-indigo-400">Proof</span></span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Delivered is a status. Proof is a story.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                1. Select Operating Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { role: 'CUSTOMER' as UserRole, label: 'Customer', icon: ShoppingBag },
                  { role: 'OWNER' as UserRole, label: 'Owner', icon: Briefcase },
                  { role: 'DELIVERY_AGENT' as UserRole, label: 'Courier', icon: Truck },
                  { role: 'ADMIN' as UserRole, label: 'Admin', icon: Shield }
                ].map(item => {
                  const Icon = item.icon;
                  const active = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(item.role);
                        const match = demoPersonas.find(p => p.role === item.role);
                        if (match && name === '') {
                          setName(match.name);
                          setEmail(match.email);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        active 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50' 
                          : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  2. Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Chakradhar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  3. Email / Gmail Address
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. user@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter ParcelProof as {selectedRole.replace('_', ' ')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Personas */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick-Fill Seeded Demo Personas
              </span>
              <span className="text-[11px] text-slate-500">1-click select</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoPersonas.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => selectPersona(p)}
                  className={`p-2.5 rounded-xl text-left border transition flex items-start justify-between group ${
                    email === p.email 
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-white' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {p.name}
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {p.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.email}</div>
                  </div>
                  {email === p.email && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Evidence-Grounded Dispute Intelligence Platform · Nimbus Hackathon
        </p>
      </div>
    </div>
  );
}
