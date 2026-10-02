'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, ChevronDown, ShoppingBag, Briefcase, Truck, Headset, Shield, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/lib/types';

interface RoleOption {
  role: UserRole;
  name: string;
  id: string;
  email: string;
  label: string;
  path: string;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'CUSTOMER',
    name: 'Customer Account',
    id: 'CUS-001',
    email: 'alex@example.com',
    label: 'Customer Portal',
    path: '/customer',
    color: 'var(--brand-orange)'
  },
  {
    role: 'OWNER',
    name: 'Store Operations',
    id: 'OWN-001',
    email: 'owner@parcelproof.com',
    label: 'Owner Operations',
    path: '/owner',
    color: 'var(--brand-teal)'
  },
  {
    role: 'DELIVERY_AGENT',
    name: 'Courier Agent',
    id: 'DEL-AGENT-001',
    email: 'courier@parcelproof.com',
    label: 'Delivery Courier',
    path: '/delivery',
    color: '#3b82f6'
  },
  {
    role: 'AGENT',
    name: 'Priya Shah',
    id: 'AGT-001',
    email: 'priya@parcelproof.com',
    label: 'Support Copilot',
    path: '/agent',
    color: '#a855f7'
  },
  {
    role: 'ADMIN',
    name: 'Platform Admin',
    id: 'ADM-001',
    email: 'admin@parcelproof.com',
    label: 'Admin Console',
    path: '/admin',
    color: '#22c55e'
  }
];

export default function RoleSwitcher({ currentRole, currentName }: { currentRole?: string; currentName?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const active = ROLES.find(r => r.role === currentRole) || ROLES[0];

  async function switchRole(target: RoleOption) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, password: 'password123' })
      });
      if (res.ok) {
        setOpen(false);
        router.push(target.path);
      }
    } catch {
      router.push(target.path);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div suppressHydrationWarning style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="button secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          fontSize: 'var(--xs)',
          borderRadius: 'var(--r-md)',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer'
        }}
        title="Switch Demo Role"
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: active.color, display: 'inline-block' }} />
        <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{currentName || active.name}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({active.role})</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setOpen(false)}
          />
          <div
            suppressHydrationWarning
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: 260,
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--sh-xl)',
              padding: 'var(--s2)',
              zIndex: 999,
              backdropFilter: 'blur(16px)'
            }}
          >
            <div style={{ padding: '6px 8px', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>
              Switch Demo Identity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              {ROLES.map(r => {
                const isSelected = r.role === currentRole;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => switchRole(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--r-sm)',
                      background: isSelected ? 'var(--surface-sunken)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-bright)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
                        {r.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2, paddingLeft: 12 }}>
                        {r.label} · {r.id}
                      </div>
                    </div>
                    {isSelected && <span style={{ fontSize: '0.7rem', color: 'var(--brand-teal)', fontWeight: 600 }}>Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
