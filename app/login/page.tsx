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
  Shield
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
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
        router.push('/customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-lg">
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

        {/* Main Form Card */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* 1. Select Role */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { role: 'CUSTOMER' as UserRole, label: 'Customer', icon: ShoppingBag },
                  { role: 'OWNER' as UserRole, label: 'Owner', icon: Briefcase },
                  { role: 'DELIVERY_AGENT' as UserRole, label: 'Delivery Agent', icon: Truck },
                  { role: 'ADMIN' as UserRole, label: 'Admin', icon: Shield }
                ].map(item => {
                  const Icon = item.icon;
                  const active = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setSelectedRole(item.role)}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                        active 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50' 
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. User Information Inputs */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email / Gmail Address
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email address"
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
                  <span>Continue as {selectedRole.replace('_', ' ')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Evidence-Grounded Dispute Intelligence Platform · Nimbus Hackathon
        </p>
      </div>
    </div>
  );
}
