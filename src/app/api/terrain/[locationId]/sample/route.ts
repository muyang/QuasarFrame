import { getTerrain } from '@/server/terrain';

export async function GET(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
  const query = new URL(req.url).searchParams;
  if (!query.has('longitude') || !query.has('latitude')) return Response.json({ error: '缺少经纬度' }, { status: 400 });
  const longitude = Number(query.get('longitude')), latitude = Number(query.get('latitude'));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return Response.json({ error: '无效经纬度' }, { status: 400 });
  }
  try {
    const terrain = getTerrain((await params).locationId);
    if (!terrain) return Response.json({ error: '此地点暂无真实地形数据' }, { status: 404 });
    const elevationM = terrain.sample(longitude, latitude);
    return Response.json({ longitude, latitude, elevationM, status: elevationM === null ? 'outside_coverage' : 'sampled',
      dataVersion: terrain.metadata.dataVersion, horizontalDatum: terrain.metadata.horizontalDatum,
      verticalDatum: terrain.metadata.verticalDatum, rasterType: terrain.metadata.rasterType,
      fillMaskStatus: terrain.metadata.fillMaskStatus }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Terrain sample unavailable:', error);
    return Response.json({ error: '地形数据校验失败' }, { status: 503 });
  }
}
