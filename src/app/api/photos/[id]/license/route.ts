import { and, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { requireAuth, getUserId, isAdmin } from '@/auth/middleware';
import { db } from '@/db';
import { photos, sourceLicenses } from '@/db/schema';
import { distributionScopeSchema, parseDistributionScope } from '@/lib/license';
import { latestSourceLicense } from '@/server/licenses';

export const runtime = 'nodejs';

const submitSchema = z.object({
  attestOwnership: z.literal(true),
  scope: distributionScopeSchema,
  evidenceUrl: z.url().startsWith('https://').nullable().optional(),
}).strict();

async function ownedPhoto(id: string) {
  const { error, session } = await requireAuth();
  if (error) return { error, photo: null, userId: null, admin: false };
  const photo = db.select({ id: photos.id, userId: photos.userId }).from(photos).where(eq(photos.id, id)).get();
  const userId = getUserId(session)!;
  if (!photo || (photo.userId !== userId && !isAdmin(session))) {
    return { error: Response.json({ error: '作品不存在' }, { status: 404 }), photo: null, userId: null, admin: false };
  }
  return { error: null, photo, userId, admin: isAdmin(session) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, photo } = await ownedPhoto((await params).id);
  if (error) return error;
  const license = latestSourceLicense('photo', photo!.id);
  return Response.json({ license: license ? {
    id: license.id, version: license.version, status: license.status,
    scope: parseDistributionScope(license.scopeJson), evidenceUrl: license.evidenceUrl,
    reviewedAt: license.reviewedAt, revokedAt: license.revokedAt,
  } : null }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, photo, userId } = await ownedPhoto((await params).id);
  if (error) return error;
  if (photo!.userId !== userId) return Response.json({ error: '仅作者可申请授权' }, { status: 403 });
  const parsed = submitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const nextVersion = (latestSourceLicense('photo', photo!.id)?.version ?? 0) + 1;
  const id = uuid();
  db.insert(sourceLicenses).values({
    id, resourceType: 'photo', resourceId: photo!.id, ownerId: userId,
    version: nextVersion, status: 'pending', scopeJson: JSON.stringify(parsed.data.scope),
    evidenceUrl: parsed.data.evidenceUrl ?? null,
  }).run();
  return Response.json({ id, version: nextVersion, status: 'pending' }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, photo, userId } = await ownedPhoto((await params).id);
  if (error) return error;
  if (photo!.userId !== userId) return Response.json({ error: '仅作者可撤销授权' }, { status: 403 });
  const license = latestSourceLicense('photo', photo!.id);
  if (!license) return Response.json({ error: '尚无授权记录' }, { status: 404 });
  if (license.status !== 'revoked') db.update(sourceLicenses)
    .set({ status: 'revoked', revokedAt: new Date().toISOString() })
    .where(and(eq(sourceLicenses.id, license.id), eq(sourceLicenses.ownerId, userId!))).run();
  return Response.json({ status: 'revoked' });
}
