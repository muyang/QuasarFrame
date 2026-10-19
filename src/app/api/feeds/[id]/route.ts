import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { cameraFeeds, users } from '@/db/schema';
import { requireAuth, getUserId, getUserRole } from '@/auth/middleware';
import { feedUpdateSchema } from '@/lib/validators';
import { canViewFeed, isFeedLicensed } from '@/lib/feed-access';
import { allowedUpstreamUrl, potentialUpstreamUrl } from '@/lib/feed-upstream';

// GET — Feed detail (with access check)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await import('@/auth/config').then((m) => m.auth());
  const currentUserId = session?.user ? getUserId(session) : null;

  const [feed] = await db
    .select({
      id: cameraFeeds.id,
      name: cameraFeeds.name,
      locationId: cameraFeeds.locationId,
      type: cameraFeeds.type,
      streamUrl: cameraFeeds.streamUrl,
      snapshotUrl: cameraFeeds.snapshotUrl,
      streamType: cameraFeeds.streamType,
      isLive: cameraFeeds.isLive,
      thumbnailUrl: cameraFeeds.thumbnailUrl,
      description: cameraFeeds.description,
      status: cameraFeeds.status,
      userId: cameraFeeds.userId,
      createdAt: cameraFeeds.createdAt,
    })
    .from(cameraFeeds)
    .where(eq(cameraFeeds.id, id))
    .limit(1);

  if (!feed) {
    return NextResponse.json({ error: '摄像头不存在' }, { status: 404 });
  }

  const { canAccess, reason } = await canViewFeed(feed, currentUserId, session?.user?.role);
  const canInspect = (Boolean(currentUserId) && feed.userId === currentUserId) || session?.user?.role === 'admin';
  if ((!isFeedLicensed(id) || feed.status !== 'active') && !canInspect) {
    return NextResponse.json({ error: '摄像头尚未发布' }, { status: 404 });
  }
  const responseFeed = {
    ...feed,
    streamUrl: canAccess && feed.streamType === 'flv' && feed.streamUrl
      ? `/api/feeds/${id}/stream` : null,
    snapshotUrl: canAccess && feed.snapshotUrl ? `/api/feeds/${id}/snapshot` : null,
    thumbnailUrl: canAccess && feed.snapshotUrl ? `/api/feeds/${id}/snapshot` : null,
  };

  // Get owner info
  let owner = null;
  if (feed.userId) {
    const [u] = await db
      .select({ id: users.id, name: users.name, avatar: users.avatar, role: users.role, isCreator: users.isCreator })
      .from(users)
      .where(eq(users.id, feed.userId))
      .limit(1);
    owner = u || null;
  }

  return NextResponse.json({
    ...responseFeed,
    owner,
    canAccess,
    reason,
  });
}

// PATCH — Update feed (owner or admin)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const userId = getUserId(session)!;
  const userRole = getUserRole(session);

  const [existing] = await db.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '摄像头不存在' }, { status: 404 });
  }

  if (existing.userId !== userId && userRole !== 'admin') {
    return NextResponse.json({ error: '无权修改' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = feedUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    const fields = ['name', 'locationId', 'streamUrl', 'snapshotUrl', 'streamType', 'description', 'status'] as const;

    for (const field of fields) {
      if (parsed.data[field] !== undefined) {
        updateData[field] = parsed.data[field];
      }
    }

    if ((parsed.data.streamUrl && !potentialUpstreamUrl(parsed.data.streamUrl)) ||
        (parsed.data.snapshotUrl && !potentialUpstreamUrl(parsed.data.snapshotUrl))) {
      return NextResponse.json({ error: '上游地址格式或目标无效' }, { status: 400 });
    }
    if (parsed.data.status === 'active' && userRole !== 'admin') {
      return NextResponse.json({ error: '发布摄像头需要管理员审核' }, { status: 403 });
    }
    if (parsed.data.status === 'active' &&
        ((parsed.data.streamUrl ?? existing.streamUrl) && !(await allowedUpstreamUrl(parsed.data.streamUrl ?? existing.streamUrl!)) ||
         (parsed.data.snapshotUrl ?? existing.snapshotUrl) && !(await allowedUpstreamUrl(parsed.data.snapshotUrl ?? existing.snapshotUrl!)))) {
      return NextResponse.json({ error: '发布前需配置获准的上游来源' }, { status: 400 });
    }
    if (parsed.data.status !== 'active' &&
        (parsed.data.streamUrl !== undefined || parsed.data.snapshotUrl !== undefined)) {
      updateData.status = 'inactive';
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(cameraFeeds).set(updateData).where(eq(cameraFeeds.id, id));
    }

    return NextResponse.json({ message: '更新成功' });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE — Delete feed (owner or admin)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const userId = getUserId(session)!;
  const userRole = getUserRole(session);

  const [existing] = await db.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '摄像头不存在' }, { status: 404 });
  }
  if (existing.userId !== userId && userRole !== 'admin') {
    return NextResponse.json({ error: '无权删除' }, { status: 403 });
  }

  await db.delete(cameraFeeds).where(eq(cameraFeeds.id, id));
  return NextResponse.json({ message: '已删除' });
}
