import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { cameraFeeds } from '@/db/schema';

// GET — List all camera feeds for admin
export async function GET(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const results = await db
    .select({
      id: cameraFeeds.id,
      name: cameraFeeds.name,
      locationId: cameraFeeds.locationId,
      type: cameraFeeds.type,
      streamType: cameraFeeds.streamType,
      isLive: cameraFeeds.isLive,
      status: cameraFeeds.status,
      userId: cameraFeeds.userId,
      createdAt: cameraFeeds.createdAt,
    })
    .from(cameraFeeds)
    .orderBy(desc(cameraFeeds.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ feeds: results, page, limit });
}
