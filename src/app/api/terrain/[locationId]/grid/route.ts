import { getDisplayGrid, getTerrain } from '@/server/terrain';
import { getCataloguePlace } from '@/server/places';

export async function GET(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const locationId = (await params).locationId;
    const terrain = getTerrain(locationId);
    if (!terrain) return Response.json({ error: '此地点暂无真实地形数据' }, { status: 404 });
    const catalogue = getCataloguePlace(locationId);
    const catalogueSampleM = catalogue ? terrain.sample(...catalogue.coordinates) : null;
    const query = new URL(req.url).searchParams;
    const longitude = query.has('longitude') ? Number(query.get('longitude')) : catalogue?.coordinates[0];
    const latitude = query.has('latitude') ? Number(query.get('latitude')) : catalogue?.coordinates[1];
    if (longitude === undefined || latitude === undefined || !Number.isFinite(longitude) || !Number.isFinite(latitude)
      || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return Response.json({ error: '无效机位坐标' }, { status: 400 });
    }
    const originSampleM = terrain.sample(longitude, latitude);
    return Response.json({ metadata: terrain.metadata, grid: getDisplayGrid(terrain), catalogueSampleM, originSampleM },
      { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('Terrain grid unavailable:', error);
    return Response.json({ error: '地形数据校验失败' }, { status: 503 });
  }
}
