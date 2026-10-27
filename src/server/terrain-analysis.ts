import * as SunCalc from 'suncalc';
import { locations } from '@/data/locations';
import { bodyAgainstHorizon, horizonFromProfile, terrainProfile, theoreticalLineOfSight } from '@/lib/geo';
import { validateResourceRequest } from '@/lib/resource-card';
import type { TerrainAnalysisInput } from '@/lib/terrain-analysis';
import { terrainCardFromMetadata } from './resource-catalog';
import { getTerrain } from './terrain';

export function analyzeTerrain(locationId: string, input: TerrainAnalysisInput) {
  const terrain = getTerrain(locationId);
  if (!terrain) return null;
  const metadata = terrain.metadata;
  const card = terrainCardFromMetadata(metadata);
  const origin = input.vantage.coordinates;
  const contract = validateResourceRequest(card, {
    operation: 'terrain.analyze.v1', access: 'public', coordinates: origin, horizontalCrs: 'EPSG:4326',
    verticalDatum: input.vantage.elevationM === null ? null : input.vantage.verticalDatum,
    at: input.at,
  });
  const sample = terrain.sample;
  const base = {
    dataVersion: metadata.dataVersion,
    dataset: metadata.dataset,
    verticalDatum: metadata.verticalDatum,
    horizontalDatum: metadata.horizontalDatum,
    resource: {
      cardId: card.id, cardVersion: card.version,
      sourceUrl: card.provenance.sourceUrl, attribution: card.provenance.attribution,
      contentSha256: card.provenance.contentSha256, qualityStatus: card.quality.status,
    },
    coordinateStatus: input.vantage.coordinateSource === 'catalogue' ? 'illustrative' : 'unverified',
    fillMaskStatus: metadata.fillMaskStatus,
    uncertainty: 'DSM includes vegetation/buildings; no refraction, near-field objects, fill mask, or field calibration',
  };
  if (!contract.ok && contract.reason === 'outside_coverage') return { ...base, status: 'outside_coverage' as const };
  if (!contract.ok && contract.reason !== 'vertical_datum_mismatch') throw new Error(`Terrain resource contract rejected: ${contract.reason}`);
  const sampledOrigin = sample(...origin);
  if (sampledOrigin === null) return { ...base, status: 'outside_coverage' as const };
  const catalogue = locations.find((item) => item.id === locationId);
  const catalogueDifferenceM = catalogue && origin[0] === catalogue.coordinates[0] && origin[1] === catalogue.coordinates[1]
    ? Math.round(catalogue.elevation - sampledOrigin) : null;
  if (input.vantage.coordinateSource === 'catalogue' && catalogueDifferenceM !== null && Math.abs(catalogueDifferenceM) > 100) {
    return { ...base, status: 'illustrative_coordinate_mismatch' as const,
      sampledElevationM: sampledOrigin, catalogueDifferenceM };
  }
  if (!contract.ok && contract.reason === 'vertical_datum_mismatch') {
    return { ...base, status: 'datum_mismatch' as const, sampledElevationM: sampledOrigin, catalogueDifferenceM };
  }
  const observerElevationM = input.vantage.elevationM ?? sampledOrigin;
  const options = { origin, cameraHeightM: input.vantage.cameraHeightM,
    observerElevationM, maxDistanceM: input.maxDistanceM, stepM: input.stepM, sample };
  const profile = terrainProfile({ ...options, azimuthDeg: input.azimuthDeg });
  const horizon = horizonFromProfile(profile.points);
  const distantRidge = horizonFromProfile(profile.points, 2000);
  const at = new Date(input.at);
  const positionFor = (body: 'sun' | 'moon') => {
    const position = body === 'sun'
      ? SunCalc.getPosition(at, origin[1], origin[0])
      : SunCalc.getMoonPosition(at, origin[1], origin[0]);
    const bodyProfile = terrainProfile({ ...options, azimuthDeg: position.azimuth });
    const bodyHorizon = horizonFromProfile(bodyProfile.points);
    return {
      azimuthDeg: position.azimuth, altitudeDeg: position.altitude,
      horizon: bodyHorizon, visibility: bodyAgainstHorizon(position.altitude, bodyHorizon),
    };
  };
  let subject: ReturnType<typeof theoreticalLineOfSight> | { status: 'datum_mismatch' } | null = null;
  if (input.subject) {
    subject = input.subject.elevationM !== null && input.subject.verticalDatum !== 'EGM2008'
      ? { status: 'datum_mismatch' }
      : theoreticalLineOfSight({
        origin, target: input.subject.coordinates, cameraHeightM: input.vantage.cameraHeightM,
        targetHeightM: input.subject.heightAboveGroundM, observerElevationM,
        targetElevationM: input.subject.elevationM ?? undefined, stepM: input.stepM, sample,
      });
  }
  return {
    ...base, status: profile.complete ? 'theoretical_only' as const : 'partial_coverage' as const,
    sampledElevationM: sampledOrigin, observerElevationM, catalogueDifferenceM,
    profile: profile.points, horizon, distantRidge,
    sun: positionFor('sun'), moon: positionFor('moon'), subject,
  };
}
