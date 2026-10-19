import { NextResponse } from 'next/server';
import { eq, and, desc, like, inArray } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getUserId, requireAuth } from '@/auth/middleware';
import { db } from '@/db';
import { cameraFeeds } from '@/db/schema';
import { feedCreateSchema } from '@/lib/validators';
import { licensedFeedIds } from '@/lib/feed-access';
import { potentialUpstreamUrl } from '@/lib/feed-upstream';
import { auth } from '@/auth/config';

// GET — List camera feeds with filtering and pagination
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const locationId = url.searchParams.get('locationId');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('q');
  const mine = url.searchParams.get('mine') === '1';
  const offset = (page - 1) * limit;

  const conditions = [];
  if (mine) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    conditions.push(eq(cameraFeeds.userId, session.user.id));
  } else {
    conditions.push(eq(cameraFeeds.status, 'active'));
    conditions.push(inArray(cameraFeeds.id, licensedFeedIds()));
  }

  if (locationId) conditions.push(eq(cameraFeeds.locationId, locationId));
  if (type) conditions.push(eq(cameraFeeds.type, type as 'official' | 'third_party'));
  if (search) conditions.push(like(cameraFeeds.name, `%${search}%`));

  const results = await db
    .select({
      id: cameraFeeds.id,
      name: cameraFeeds.name,
      locationId: cameraFeeds.locationId,
      type: cameraFeeds.type,
      snapshotUrl: cameraFeeds.snapshotUrl,
      streamUrl: cameraFeeds.streamUrl,
      streamType: cameraFeeds.streamType,
      isLive: cameraFeeds.isLive,
      thumbnailUrl: cameraFeeds.thumbnailUrl,
      description: cameraFeeds.description,
      status: cameraFeeds.status,
      createdAt: cameraFeeds.createdAt,
    })
    .from(cameraFeeds)
    .where(and(...conditions))
    .orderBy(desc(cameraFeeds.createdAt))
    .limit(limit)
    .offset(offset);

  const sanitized = results.map((feed) => ({
    ...feed,
    streamUrl: mine && feed.streamType === 'flv' && feed.streamUrl ? `/api/feeds/${feed.id}/stream` : null,
    snapshotUrl: (mine || feed.type === 'official') && feed.snapshotUrl ? `/api/feeds/${feed.id}/snapshot` : null,
    thumbnailUrl: (mine || feed.type === 'official') && feed.snapshotUrl ? `/api/feeds/${feed.id}/snapshot` : null,
  }));

  return NextResponse.json({ feeds: sanitized, page, limit });
}

// POST — Create new camera feed (any authenticated user)
export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  try {
    const body = await req.json();
    const parsed = feedCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, locationId, streamUrl, snapshotUrl, streamType, description } = parsed.data;
    if ((streamUrl && !potentialUpstreamUrl(streamUrl)) ||
        (snapshotUrl && !potentialUpstreamUrl(snapshotUrl))) {
      return NextResponse.json({ error: '上游地址格式或目标无效' }, { status: 400 });
    }

    const feedId = uuid();
    await db.insert(cameraFeeds).values({
      id: feedId,
      name,
      locationId: locationId || null,
      userId,
      type: session!.user.role === 'admin' ? parsed.data.type : 'third_party',
      streamUrl: streamUrl || null,
      snapshotUrl: snapshotUrl || null,
      streamType,
      isLive: !!streamUrl,
      thumbnailUrl: null,
      description: description || null,
      status: 'inactive',
    });

    return NextResponse.json({ id: feedId, message: '已提交摄像头，授权审核后可发布' }, { status: 201 });
  } catch (err) {
    console.error('Feed create error:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
