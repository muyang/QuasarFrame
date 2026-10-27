import { NASA_SOURCE_URL } from '@/lib/shooting-workspace';
import { isValidBbox, resourceCardSchema, type ResourceCard } from '@/lib/resource-card';
import { getTerrain, type TerrainMetadata } from './terrain';

export const NIUBEI_TERRAIN_CARD_ID = 'terrain.dem.niubei';
export const NASA_MAP_CARD_ID = 'map.nasa.blue-marble';
export const ASTRONOMY_CARD_ID = 'astronomy.sun-moon';

const copernicusTermsUrl = 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM';

export function terrainCardFromMetadata(metadata: TerrainMetadata): ResourceCard {
  if (metadata.locationId !== 'niubei' || !isValidBbox(metadata.bounds)) throw new Error('Invalid terrain card coverage');
  return resourceCardSchema.parse({
    schemaVersion: 1,
    id: NIUBEI_TERRAIN_CARD_ID,
    kind: 'data',
    version: metadata.dataVersion,
    title: `${metadata.dataset} · 牛背山试点`,
    status: 'ready',
    provider: { name: 'Copernicus DEM', url: copernicusTermsUrl },
    coverage: {
      bbox: metadata.bounds, horizontalCrs: metadata.horizontalDatum,
      verticalDatum: metadata.verticalDatum,
      temporal: { mode: 'static', validFrom: null, validUntil: null },
    },
    contract: {
      operations: ['terrain.analyze.v1'],
      inputSchema: 'quasarframe:terrain-analysis-input:v1',
      outputSchema: 'quasarframe:terrain-analysis-result:v1',
    },
    provenance: {
      sourceUrl: metadata.datasetUrl, attribution: metadata.attribution,
      contentSha256: metadata.elevationSha256, retrievedAt: null,
    },
    rights: { access: 'public_derived', rawRedistribution: 'not_evaluated', termsUrl: copernicusTermsUrl },
    quality: {
      status: 'unverified_accuracy', resolutionArcsec: metadata.nativeResolutionArcsec,
      limitations: [
        'DSM 包含植被与建筑，未完成现场机位和山脊精度核验。',
        `填补掩膜：${metadata.fillMaskStatus}；高度误差掩膜：${metadata.heightErrorMaskStatus}。`,
      ],
    },
  });
}

export function astronomyCard(): ResourceCard {
  return resourceCardSchema.parse({
    schemaVersion: 1,
    id: ASTRONOMY_CARD_ID,
    kind: 'capability',
    version: 'quasarframe-astronomy-v1-suncalc-2.0.0',
    title: '太阳与月亮位置及黄金时刻',
    status: 'ready',
    provider: { name: 'QuasarFrame / SunCalc', url: 'https://github.com/mourner/suncalc' },
    coverage: {
      bbox: [-180, -90, 180, 90], horizontalCrs: 'EPSG:4326', verticalDatum: 'not_applicable',
      temporal: { mode: 'computed', validFrom: null, validUntil: null },
    },
    contract: {
      operations: ['astronomy.sun-moon.v1'],
      inputSchema: 'quasarframe:coordinates-date-timezone:v1',
      outputSchema: 'quasarframe:sun-moon-data:v1',
    },
    provenance: {
      sourceUrl: 'https://github.com/mourner/suncalc',
      attribution: '基于 SunCalc 2.0.0 的日月几何计算；地点目录坐标仍可能只是示意。',
      contentSha256: null, retrievedAt: null,
    },
    rights: { access: 'public_derived', rawRedistribution: 'not_evaluated', termsUrl: 'https://github.com/mourner/suncalc' },
    quality: {
      status: 'theoretical', resolutionArcsec: null,
      limitations: ['不包含地形遮挡、大气与天气；精确拍摄判断需使用实测机位。'],
    },
  });
}

export function nasaMapCard(): ResourceCard {
  return resourceCardSchema.parse({
    schemaVersion: 1, id: NASA_MAP_CARD_ID, kind: 'data', version: 'blue-marble-2004-08-gibs-level8-v1',
    title: 'NASA Blue Marble 全球概览 · 2004-08', status: 'ready',
    provider: { name: 'NASA Earth Observatory / MODIS', url: 'https://earthobservatory.nasa.gov/features/BlueMarble' },
    coverage: { bbox: [-180, -85.051129, 180, 85.051129], horizontalCrs: 'EPSG:4326', verticalDatum: 'not_applicable',
      temporal: { mode: 'static', validFrom: null, validUntil: null } },
    contract: { operations: ['map.overview.v1'], inputSchema: 'ogc:wmts:GoogleMapsCompatible_Level8', outputSchema: 'image/jpeg;tileSize=256;maxzoom=8' },
    provenance: { sourceUrl: NASA_SOURCE_URL, attribution: 'NASA Earth Observatory / MODIS · Blue Marble, August 2004; shaded relief and bathymetry.', contentSha256: null, retrievedAt: null },
    rights: { access: 'public_derived', rawRedistribution: 'not_evaluated', termsUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/' },
    quality: { status: 'unverified_accuracy', resolutionArcsec: null,
      limitations: ['2004 年 8 月概览影像，不是实时画面或 DEM。', '0–8 级瓦片；继续放大不增加细节，不能据此判定精确机位或山脊。', '在线瓦片可用性取决于 NASA 服务与网络，Card 登记不代表实时健康检查。'] },
  });
}

export function getResourceCard(id: string): ResourceCard | null {
  if (id === NASA_MAP_CARD_ID) return nasaMapCard();
  if (id === ASTRONOMY_CARD_ID) return astronomyCard();
  if (id === NIUBEI_TERRAIN_CARD_ID) {
    const terrain = getTerrain('niubei');
    return terrain ? terrainCardFromMetadata(terrain.metadata) : null;
  }
  return null;
}

export function listResourceCatalog(): { cards: ResourceCard[]; unavailable: Array<{ id: string; reason: string }> } {
  const cards = [astronomyCard(), nasaMapCard()];
  const unavailable: Array<{ id: string; reason: string }> = [];
  try {
    const terrain = getTerrain('niubei');
    if (terrain) cards.push(terrainCardFromMetadata(terrain.metadata));
    else unavailable.push({ id: NIUBEI_TERRAIN_CARD_ID, reason: 'data_not_installed' });
  } catch (error) {
    console.error('Terrain resource unavailable:', error);
    unavailable.push({ id: NIUBEI_TERRAIN_CARD_ID, reason: 'data_validation_failed' });
  }
  return { cards, unavailable };
}
