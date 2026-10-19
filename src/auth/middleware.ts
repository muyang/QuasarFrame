import { auth } from './config';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export type UserRole = 'user' | 'admin';

/** Require authentication — returns session or 401 response */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

/** Require specific role(s) — returns session or 403 response */
export async function requireRole(...roles: UserRole[]) {
  const result = await requireAuth();
  if (result.error) return result;

  const userRole = result.session!.user.role;
  if (!roles.includes(userRole)) {
    return {
      error: NextResponse.json({ error: '权限不足' }, { status: 403 }),
      session: null,
    };
  }
  return result;
}

/** Check if user is admin */
export function isAdmin(session: Session | null | undefined): boolean {
  return session?.user?.role === 'admin';
}

/** Get current user ID from session */
export function getUserId(session: Session | null | undefined): string | null {
  return session?.user?.id || null;
}

/** Get current user role from session */
export function getUserRole(session: Session | null | undefined): UserRole | null {
  return session?.user?.role || null;
}
