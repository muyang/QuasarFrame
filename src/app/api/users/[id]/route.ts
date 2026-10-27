import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, photos } from '@/db/schema';
import { licensedFor } from '@/server/licenses';

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

  const photoList = await db
    .select({ id: photos.id, priceType: photos.priceType, status: photos.status })
    .from(photos)
    .where(eq(photos.userId, id));

  return NextResponse.json({
    ...user,
    photoCount: photoList.filter((photo) => photo.status === 'approved' && licensedFor('photo', photo.id,
      'web', photo.priceType === 'paid' ? 'paid' : 'view')).length,
  });
}
