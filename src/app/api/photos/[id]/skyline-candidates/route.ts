import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { photos, photoEvidenceItems, photoLocationCandidates } from '@/db/schema';
import { skylineMatchSchema, matchSkyline } from '@/lib/skyline-match';
import { validateResourceRequest } from '@/lib/resource-card';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { terrainCardFromMetadata } from '@/server/resource-catalog';
import { getTerrain } from '@/server/terrain';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const userId = getUserId(session)!;
  const photo = db.select({ id: photos.id, userId: photos.userId, locationId: photos.locationId })
    .from(photos).where(eq(photos.id, id)).get();
  if (!photo || photo.userId !== userId) return Response.json({ error: '照片不存在' }, { status: 404 });
  if (!rateLimit(`photo-skyline:${getClientIp(req)}:${userId}`, 60_000, 3).success) {
    return Response.json({ error: '搜索过于频繁' }, { status: 429 });
  }
  const parsed = skylineMatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const terrain = photo.locationId ? getTerrain(photo.locationId) : null;
  if (!terrain) return Response.json({ error: '此照片地点暂无真实地形数据' }, { status: 404 });
  const card = terrainCardFromMetadata(terrain.metadata);
  const contract = validateResourceRequest(card, {
    operation: 'terrain.analyze.v1', access: 'public', coordinates: parsed.data.searchCenter,
    horizontalCrs: 'EPSG:4326', verticalDatum: 'EGM2008',
  });
  if (!contract.ok) return Response.json({ error: `搜索区域不满足地形契约：${contract.reason}` }, { status: 422 });
  const result = matchSkyline(parsed.data, terrain.sample);
  if (result.status === 'candidates') db.transaction((tx) => {
    const runId = uuid();
    tx.insert(photoEvidenceItems).values({
      id: runId, photoId: id, ownerId: userId, field: 'skyline_markers', source: 'manual',
      valueJson: JSON.stringify({ input: parsed.data, terrainCardId: card.id, terrainVersion: card.version }),
      confidence: 'reported',
    }).run();
    for (const candidate of result.candidates) tx.insert(photoLocationCandidates).values({
      id: uuid(), photoId: id, ownerId: userId,
      longitude: candidate.coordinates[0], latitude: candidate.coordinates[1],
      radiusM: result.minimumUncertaintyRadiusM, azimuthDeg: parsed.data.azimuthDeg,
      method: 'skyline', score: candidate.rmsDeg, status: 'proposed',
      evidenceJson: JSON.stringify({ runId, terrainCardId: card.id, terrainVersion: card.version,
        rmsDeg: candidate.rmsDeg, tiltDeg: candidate.tiltDeg, rollSlopeDeg: candidate.rollSlopeDeg,
        confidence: 'low', note: result.note }),
    }).run();
  });
  return Response.json({ ...result, terrainCardId: card.id, terrainVersion: card.version,
    visualGeolocation: 'marker_assisted_low_confidence' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
