import { terrainAnalysisInputSchema } from '@/lib/terrain-analysis';
import { analyzeTerrain } from '@/server/terrain-analysis';

export async function POST(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const parsed = terrainAnalysisInputSchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const result = analyzeTerrain((await params).locationId, parsed.data);
    if (!result) return Response.json({ error: '此地点暂无真实地形数据' }, { status: 404 });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Terrain analysis unavailable:', error);
    return Response.json({ error: '地形分析失败' }, { status: 503 });
  }
}
