import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { cameraFeeds } from '@/db/schema';
import { canViewFeed } from '@/lib/feed-access';
import { fetchAllowedUpstream } from '@/lib/feed-upstream';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [feed] = await db.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).limit(1);
  if (!feed) return NextResponse.json({ error: '摄像头不存在' }, { status: 404 });
  if (feed.status !== 'active' || !feed.snapshotUrl) {
    return NextResponse.json({ error: '画面暂不可用' }, { status: 503 });
  }
  const session = await auth();
  const access = await canViewFeed(feed, session?.user?.id ?? null, session?.user?.role);
  if (!access.canAccess) return NextResponse.json({ error: '无观看权限' }, { status: 403 });

  const upstream = await fetchAllowedUpstream(feed.snapshotUrl, feed.authHeader ?? undefined);
  if (!upstream?.ok || !upstream.body) {
    return NextResponse.json({ error: '无法获取画面' }, { status: 502 });
  }
  const type = upstream.headers.get('content-type')?.split(';')[0] ?? '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
    await upstream.body.cancel();
    return NextResponse.json({ error: '上游画面格式无效' }, { status: 502 });
  }
  const length = Number(upstream.headers.get('content-length') ?? 0);
  if (length > 10 * 1024 * 1024) {
    await upstream.body.cancel();
    return NextResponse.json({ error: '上游画面过大' }, { status: 502 });
  }
  let received = 0;
  const limitedBody = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > 10 * 1024 * 1024) {
        controller.error(new Error('snapshot size limit exceeded'));
      } else {
        controller.enqueue(chunk);
      }
    },
  }));
  return new Response(limitedBody, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
