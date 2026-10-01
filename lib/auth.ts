import { cookies } from 'next/headers';
import type { User, UserRole } from './types';
import { getOrder, getOrCreateUserInDb, getUserByEmailInDb, USERS_FIXTURE } from './db';

export const USERS = USERS_FIXTURE;

const AUTH_COOKIE = 'parcelproof_session';

export function authenticateUser(email: string, password = 'password123', name?: string, role?: UserRole): User | null {
  const normalizedEmail = email.toLowerCase().trim();

  // If role and name are specified, dynamically create or retrieve the user from database
  if (role && name) {
    return getOrCreateUserInDb(name, normalizedEmail, role, password);
  }

  // Look up user in SQLite
  const existingInDb = getUserByEmailInDb(normalizedEmail);
  if (existingInDb) {
    if (password && existingInDb.passwordHash && existingInDb.passwordHash !== password) {
      return null;
    }
    const { passwordHash: _, ...safeUser } = existingInDb;
    return safeUser;
  }

  // Fall back to fixture definitions
  const fixture = USERS_FIXTURE.find(u => u.email.toLowerCase() === normalizedEmail);
  if (fixture) {
    if (password && fixture.passwordHash !== password) {
      return null;
    }
    const { passwordHash: _, ...safeUser } = fixture;
    return safeUser;
  }

  return null;
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
      accountId: parsed.accountId ?? null,
      agentId: parsed.agentId ?? null
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
  if (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'AGENT') return true;
  if (user.role === 'CUSTOMER') {
    try {
      const order = getOrder(orderId);
      return order.accountId === user.accountId;
    } catch {
      return false;
    }
  }
  if (user.role === 'DELIVERY_AGENT') {
    try {
      const order = getOrder(orderId);
      return !order.deliveryAgentId || order.deliveryAgentId === user.agentId || order.deliveryAgentName === user.name;
    } catch {
      return false;
    }
  }
  return false;
}
