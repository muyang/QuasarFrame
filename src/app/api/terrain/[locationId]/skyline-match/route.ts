import { requireAuth } from '@/auth/middleware';
import { skylineMatchSchema, matchSkyline } from '@/lib/skyline-match';
import { getTerrain } from '@/server/terrain';

export async function POST(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const parsed = skylineMatchSchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const terrain = getTerrain((await params).locationId);
    if (!terrain) return Response.json({ error: '此地点暂无真实地形数据' }, { status: 404 });
    const result = matchSkyline(parsed.data, terrain.sample);
    return Response.json({ ...result, dataVersion: terrain.metadata.dataVersion,
      coordinateStatus: 'visual_candidate_unverified' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Skyline match unavailable:', error);
    return Response.json({ error: '山脊候选搜索失败' }, { status: 503 });
  }
}
