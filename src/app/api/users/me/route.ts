import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { users } from '@/db/schema';
import { profileUpdateSchema } from '@/lib/validators';

// GET current user profile
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      isCreator: users.isCreator,
      membership: users.membership,
      balance: users.balance,
      bio: users.bio,
      phone: users.phone,
      wechatId: users.wechatId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH update profile
export async function PATCH(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  try {
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof users.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
    if (parsed.data.avatar !== undefined) updateData.avatar = parsed.data.avatar;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.wechatId !== undefined) updateData.wechatId = parsed.data.wechatId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有需要更新的内容' }, { status: 400 });
    }

    updateData.updatedAt = new Date().toISOString();

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return NextResponse.json({ message: '更新成功' });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
