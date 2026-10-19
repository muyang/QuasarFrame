import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, photos } from '@/db/schema';

// GET public user profile
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      isCreator: users.isCreator,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  // Get approved photo count
  const [photoCount] = await db
    .select({ count: photos.id })
    .from(photos)
    .where(eq(photos.userId, id));

  // Count photos
  const photoList = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.userId, id));

  return NextResponse.json({
    ...user,
    photoCount: photoList.length,
  });
}
