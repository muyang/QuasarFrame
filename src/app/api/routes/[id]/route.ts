import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { routes, routeStops, users } from '@/db/schema';
import { routeUpdateSchema } from '@/lib/validators';

function nowTs() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// GET — route detail with stops
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [route] = await db
    .select({
      id: routes.id,
      userId: routes.userId,
      title: routes.title,
      description: routes.description,
      days: routes.days,
      bestSeason: routes.bestSeason,
      difficulty: routes.difficulty,
      coverImage: routes.coverImage,
      status: routes.status,
      viewCount: routes.viewCount,
      createdAt: routes.createdAt,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorIsCreator: users.isCreator,
    })
    .from(routes)
    .leftJoin(users, eq(users.id, routes.userId))
    .where(eq(routes.id, id))
    .limit(1);

  if (!route) {
    return NextResponse.json({ error: '线路不存在' }, { status: 404 });
  }

  // Hide drafts from non-owner viewers
  if (route.status === 'draft') {
    const session = await import('@/auth/config').then((m) => m.auth());
    const currentUserId = session?.user?.id ?? null;
    if (currentUserId !== route.userId) {
      return NextResponse.json({ error: '线路不存在' }, { status: 404 });
    }
  }

  const stops = await db
    .select()
    .from(routeStops)
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.orderIndex));

  // Bump view count (best-effort, no error propagation)
  await db.update(routes)
    .set({ viewCount: route.viewCount + 1 })
    .where(eq(routes.id, id))
    .catch(() => {});

  return NextResponse.json({ route, stops });
}

// PATCH — update route (owner only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;
  const { id } = await params;

  const [existing] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '线路不存在' }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: '无权修改' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = routeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { stops, ...updateFields } = parsed.data;

    if (Object.keys(updateFields).length > 0) {
      await db.update(routes)
        .set({ ...updateFields, updatedAt: nowTs() })
        .where(eq(routes.id, id));
    }

    // Publishing a route promotes the author to creator.
    if (parsed.data.status === 'published') {
      const { users } = await import('@/db/schema');
      await db.update(users)
        .set({ isCreator: true, updatedAt: nowTs() })
        .where(eq(users.id, userId));
    }

    // Replace stops if provided
    if (stops) {
      await db.delete(routeStops).where(eq(routeStops.routeId, id));
      if (stops.length > 0) {
        const { v4: uuid } = await import('uuid');
        await db.insert(routeStops).values(
          stops.map((stop) => ({
            id: uuid(),
            routeId: id,
            orderIndex: stop.orderIndex,
            locationId: stop.locationId ?? null,
            photoId: stop.photoId ?? null,
            note: stop.note ?? null,
            transportHint: stop.transportHint ?? null,
            bestTimeOfDay: stop.bestTimeOfDay ?? null,
            staySuggestion: stop.staySuggestion ?? null,
          }))
        );
      }
    }

    return NextResponse.json({ message: '更新成功' });
  } catch (err) {
    console.error('Route update error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE — delete route (owner only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;
  const { id } = await params;

  const [existing] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '线路不存在' }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: '无权删除' }, { status: 403 });
  }

  await db.delete(routeStops).where(eq(routeStops.routeId, id));
  await db.delete(routes).where(eq(routes.id, id));
  return NextResponse.json({ message: '已删除' });
}
