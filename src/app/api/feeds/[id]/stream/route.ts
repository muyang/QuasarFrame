import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { cameraFeeds } from '@/db/schema';
import { canViewFeed } from '@/lib/feed-access';
import { fetchAllowedUpstream } from '@/lib/feed-upstream';
import { acquireStreamSlot } from '@/lib/feed-stream-cap';
import { getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [feed] = await db.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).limit(1);
  if (!feed) return NextResponse.json({ error: '摄像头不存在' }, { status: 404 });
  if (feed.status !== 'active' || feed.streamType !== 'flv' || !feed.streamUrl) {
    return NextResponse.json({ error: '此流暂不可用' }, { status: 503 });
  }

  const session = await auth();
  const access = await canViewFeed(feed, session?.user?.id ?? null, session?.user?.role);
  if (!access.canAccess) return NextResponse.json({ error: '无观看权限' }, { status: 403 });
  const release = acquireStreamSlot(session?.user?.id ?? getClientIp(req));
  if (!release) return NextResponse.json({ error: '观看连接过多，请稍后再试' }, { status: 429 });
  const fail = (message: string) => {
    release();
    return NextResponse.json({ error: message }, { status: 502 });
  };

  const first = await fetchAllowedUpstream(feed.streamUrl, feed.authHeader ?? undefined);
  if (!first?.ok) return fail('无法连接上游流');

  let stream = first;
  if ((first.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      const payload = await readResolver(first) as { data?: unknown; code?: unknown };
      if (String(payload.code) !== '0' || typeof payload.data !== 'string') {
        return fail('上游拒绝播放');
      }
      // A resolver may only hand off to the same approved origin.
      const sameOrigin = new URL(payload.data).origin === new URL(feed.streamUrl).origin;
      if (!sameOrigin) return fail('跨站流地址已阻断');
      const second = await fetchAllowedUpstream(payload.data, feed.authHeader ?? undefined);
      if (!second?.ok) return fail('解析后的流不可用');
      stream = second;
    } catch {
      return fail('上游响应无效');
    }
  }
  if (!stream.body || (stream.headers.get('content-type') ?? '').includes('application/json')) {
    return fail('上游未返回视频流');
  }
  const reader = stream.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          release();
          controller.close();
        } else {
          controller.enqueue(chunk.value);
        }
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    async cancel(reason) {
      release();
      await reader.cancel(reason);
    },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'video/x-flv',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function readResolver(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('empty resolver response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const timeout = setTimeout(() => { void reader.cancel(); }, 5000);
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16 * 1024) throw new Error('resolver response too large');
      chunks.push(chunk.value);
    }
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } finally {
    clearTimeout(timeout);
    void reader.cancel().catch(() => undefined);
  }
}
