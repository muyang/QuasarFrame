import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { users } from '@/db/schema';
import { z } from 'zod';

const adminUserUpdateSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'admin']).optional(),
  isCreator: z.boolean().optional(),
  membership: z.enum(['free', 'photo', 'pro']).optional(),
  balance: z.number().min(0).optional(),
});

// GET — List all users (admin only)
export async function GET(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const results = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isCreator: users.isCreator,
      membership: users.membership,
      balance: users.balance,
      avatar: users.avatar,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ users: results, page, limit });
}

// PATCH — Update user role/membership/balance
export async function PATCH(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    await db
      .update(users)
      .set({
        ...updates,
      })
      .where(eq(users.id, id));

    return NextResponse.json({ message: '更新成功' });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
