import { and, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { requireAuth, getUserId, isAdmin } from '@/auth/middleware';
import { db } from '@/db';
import { photos, photoEvidenceItems, photoLocationCandidates } from '@/db/schema';

export const runtime = 'nodejs';

const decisionSchema = z.object({ candidateId: z.string().uuid(), decision: z.enum(['user_confirmed', 'rejected']) }).strict();

async function authorizedPhoto(id: string) {
  const { error, session } = await requireAuth();
  if (error) return { error, photo: null, userId: null };
  const userId = getUserId(session)!;
  const photo = db.select({ id: photos.id, userId: photos.userId }).from(photos).where(eq(photos.id, id)).get();
  if (!photo || (photo.userId !== userId && !isAdmin(session))) {
    return { error: Response.json({ error: '照片不存在' }, { status: 404 }), photo: null, userId: null };
  }
  return { error: null, photo, userId };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, photo } = await authorizedPhoto((await params).id);
  if (error) return error;
  const evidence = db.select().from(photoEvidenceItems).where(eq(photoEvidenceItems.photoId, photo!.id)).all();
  const candidates = db.select().from(photoLocationCandidates).where(eq(photoLocationCandidates.photoId, photo!.id)).all();
  return Response.json({ evidence, candidates, visualGeolocation: 'not_run', precisionStatus: 'unverified' },
    { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, photo, userId } = await authorizedPhoto((await params).id);
  if (error) return error;
  if (photo!.userId !== userId) {
    return Response.json({ error: '仅作者可确认候选' }, { status: 403 });
  }
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const candidate = db.select().from(photoLocationCandidates).where(and(
    eq(photoLocationCandidates.id, parsed.data.candidateId), eq(photoLocationCandidates.photoId, photo!.id),
  )).get();
  if (!candidate) return Response.json({ error: '候选不存在' }, { status: 404 });
  if (candidate.status !== 'proposed') return Response.json({ error: '候选已处理' }, { status: 409 });
  db.transaction((tx) => {
    tx.update(photoLocationCandidates).set({ status: parsed.data.decision })
      .where(eq(photoLocationCandidates.id, candidate.id)).run();
    tx.insert(photoEvidenceItems).values({
      id: uuid(), photoId: photo!.id, ownerId: userId!, field: 'candidate_review', source: 'manual',
      valueJson: JSON.stringify({ candidateId: candidate.id, decision: parsed.data.decision }),
      confidence: 'reported',
    }).run();
  });
  return Response.json({ status: parsed.data.decision, precisionStatus: 'unverified' });
}
