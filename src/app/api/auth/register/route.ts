import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { registerSchema } from '@/lib/validators';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const limit = rateLimit(`register:${getClientIp(req)}`, 60 * 60 * 1000, 5);
  if (!limit.success) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phone, wechatId } = parsed.data;

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user — single role model: everyone is a 'user'; creators are
    // promoted (isCreator=true) automatically when their first photo is
    // approved or first route is published.
    const userId = uuid();
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      name,
      role: 'user',
      isCreator: false,
      membership: 'free',
      balance: 0,
      bio: null,
      phone: phone || null,
      wechatId: wechatId || null,
    });

    return NextResponse.json(
      { message: '注册成功', userId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
