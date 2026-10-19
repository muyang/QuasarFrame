import { NextResponse } from 'next/server';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { routes, routeStops, users, photos } from '@/db/schema';
import { routeCreateSchema } from '@/lib/validators';

function nowTs() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// GET — list published routes
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const mine = url.searchParams.get('mine') === '1';
  const search = url.searchParams.get('q');
  const offset = (page - 1) * limit;

  const session = await import('@/auth/config').then((m) => m.auth());
  const currentUserId = session?.user?.id ?? null;

  const conditions = [];
  if (mine && currentUserId) {
    conditions.push(eq(routes.userId, currentUserId));
  } else {
    conditions.push(eq(routes.status, 'published'));
    if (search) conditions.push(like(routes.title, `%${search}%`));
  }

  const rows = await db
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
      stopCount: sql<number>`(SELECT COUNT(*) FROM route_stops WHERE route_id = ${routes.id})`,
    })
    .from(routes)
    .leftJoin(users, eq(users.id, routes.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(routes.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ routes: rows, page, limit });
}

// POST — create route (any authenticated user)
export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  try {
    const body = await req.json();
    const parsed = routeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { stops, ...routeFields } = parsed.data;
    const routeId = uuid();

    await db.insert(routes).values({
      id: routeId,
      userId,
      ...routeFields,
      days: routeFields.days ?? null,
      bestSeason: routeFields.bestSeason ?? null,
      difficulty: routeFields.difficulty ?? 2,
      coverImage: routeFields.coverImage ?? null,
      description: routeFields.description ?? null,
      status: routeFields.status ?? 'draft',
    });

    // Insert stops
    if (stops && stops.length > 0) {
      await db.insert(routeStops).values(
        stops.map((stop) => ({
          id: uuid(),
          routeId,
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

    // Publishing a route promotes the author to creator.
    if (parsed.data.status === 'published') {
      await db.update(users)
        .set({ isCreator: true, updatedAt: nowTs() })
        .where(eq(users.id, userId));
    }

    return NextResponse.json({ id: routeId, message: '创建成功' }, { status: 201 });
  } catch (err) {
    console.error('Route create error:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
