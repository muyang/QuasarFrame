import { locations } from '@/data/locations';
import { ridgeCalibrationSchema, calibrateRidge } from '@/lib/photo-calibration';
import { getTerrain } from '@/server/terrain';

export async function POST(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const parsed = ridgeCalibrationSchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { locationId } = await params;
    const terrain = getTerrain(locationId);
    if (!terrain) return Response.json({ error: '此地点暂无真实地形数据' }, { status: 404 });
    const input = parsed.data;
    const surface = terrain.sample(...input.coordinates);
    if (surface === null) return Response.json({ status: 'outside_coverage', dataVersion: terrain.metadata.dataVersion });
    const catalogue = locations.find((item) => item.id === locationId);
    if (input.coordinateSource === 'catalogue' && catalogue && Math.abs(catalogue.elevation - surface) > 100) {
      return Response.json({ status: 'illustrative_coordinate_mismatch', dataVersion: terrain.metadata.dataVersion,
        sampledElevationM: surface });
    }
    return Response.json({ ...calibrateRidge(input, terrain.sample),
      dataVersion: terrain.metadata.dataVersion, coordinateStatus: 'unverified' },
    { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Ridge calibration unavailable:', error);
    return Response.json({ error: '照片与地形校准失败' }, { status: 503 });
  }
}
