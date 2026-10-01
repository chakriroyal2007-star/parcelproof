import { cookies } from 'next/headers';
import type { User, UserRole } from './types';
import { getOrder } from './db';

export const USERS: (User & { passwordHash: string })[] = [
  {
    id: 'USR-CUST-1042',
    email: 'alex@example.com',
    name: 'Alex Morgan',
    role: 'CUSTOMER',
    accountId: 'HH-208',
    passwordHash: 'password123'
  },
  {
    id: 'USR-CUST-1043',
    email: 'sam@example.com',
    name: 'Sam Rivera',
    role: 'CUSTOMER',
    accountId: 'HH-309',
    passwordHash: 'password123'
  },
  {
    id: 'USR-AGENT-01',
    email: 'priya@parcelproof.com',
    name: 'Priya Shah',
    role: 'AGENT',
    accountId: null,
    passwordHash: 'password123'
  },
  {
    id: 'USR-AGENT-02',
    email: 'daniel@parcelproof.com',
    name: 'Daniel Kim',
    role: 'AGENT',
    accountId: null,
    passwordHash: 'password123'
  },
  {
    id: 'USR-ADMIN-01',
    email: 'admin@parcelproof.com',
    name: 'Sarah Connor',
    role: 'ADMIN',
    accountId: null,
    passwordHash: 'password123'
  }
];

const AUTH_COOKIE = 'parcelproof_session';

export function authenticateUser(email: string, password: string): User | null {
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === password);
  if (!user) return null;
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export function encodeSession(user: User): string {
  return Buffer.from(JSON.stringify({ ...user, iat: Date.now() })).toString('base64url');
}

export function decodeSession(token: string): User | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed.id || !parsed.role) return null;
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      accountId: parsed.accountId ?? null
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function authorizeCaseAccess(user: User, orderId: string): boolean {
  if (user.role === 'ADMIN' || user.role === 'AGENT') return true;
  if (user.role === 'CUSTOMER') {
    try {
      const order = getOrder(orderId);
      return order.accountId === user.accountId;
    } catch {
      return false;
    }
  }
  return false;
}
