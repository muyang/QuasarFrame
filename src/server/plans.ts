import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { places, shootingPlans, subjects, vantagePoints } from '@/db/schema';
import { type CloudPlanInput, type CloudPlanRecord } from '@/lib/cloud-plan';
import { dateKeyAtLocation, locationDateTime, minutesAtLocation } from '@/lib/location-time';
import type { ShootingPlan } from '@/lib/shooting-plan';
import { ensureIllustrativePlace, getCataloguePlace } from './places';

const now = () => new Date().toISOString();

export function getPlan(ownerId: string, id: string): CloudPlanRecord | null {
  const row = db.select().from(shootingPlans).where(and(eq(shootingPlans.id, id), eq(shootingPlans.ownerId, ownerId))).get();
  if (!row) return null;
  const place = db.select().from(places).where(eq(places.id, row.placeId)).get();
  const vantage = db.select().from(vantagePoints).where(and(eq(vantagePoints.id, row.vantagePointId), eq(vantagePoints.ownerId, ownerId))).get();
  const subject = row.subjectId ? db.select().from(subjects).where(and(eq(subjects.id, row.subjectId), eq(subjects.ownerId, ownerId))).get() : null;
  if (!place || !vantage || (row.subjectId && !subject)) return null;
  const shotAt = new Date(row.shotAt);
  const plan: ShootingPlan = {
    version: 1, locationId: place.catalogueId, name: row.title,
    coordinates: [vantage.longitude, vantage.latitude],
    coordinateSource: row.coordinateSource,
    coordinateSystem: 'WGS84-assumed',
    dateKey: dateKeyAtLocation(shotAt, row.timeZone), minutes: minutesAtLocation(shotAt, row.timeZone),
    timeZone: 'Asia/Shanghai', focalLength: row.focalLengthMm, sensor: row.sensor,
    portrait: row.portrait, azimuth: row.azimuth, elevation: row.elevation,
    travelMinutes: row.travelMinutes, setupMinutes: row.setupMinutes, notes: row.notes,
  };
  return {
    id: row.id, workspace: row.workspace ?? null,
    place: { id: place.id, catalogueId: place.catalogueId, name: place.name, status: place.status },
    plan,
    vantage: {
      id: vantage.id, name: vantage.name, source: vantage.source,
      horizontalAccuracyM: vantage.horizontalAccuracyM, elevationM: vantage.elevationM,
      verticalDatum: vantage.verticalDatum, cameraHeightM: vantage.cameraHeightM, verifiedAt: vantage.verifiedAt,
    },
    subject: subject ? {
      id: subject.id, name: subject.name, coordinates: [subject.longitude, subject.latitude],
      source: subject.source, horizontalAccuracyM: subject.horizontalAccuracyM,
      elevationM: subject.elevationM, verticalDatum: subject.verticalDatum,
      heightAboveGroundM: subject.heightAboveGroundM, verifiedAt: subject.verifiedAt,
    } : null,
    dataVersion: row.dataVersion, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

export function listPlans(ownerId: string, locationId?: string): CloudPlanRecord[] {
  const place = locationId ? db.select().from(places).where(eq(places.catalogueId, locationId)).get() : null;
  if (locationId && !place) return [];
  const condition = place
    ? and(eq(shootingPlans.ownerId, ownerId), eq(shootingPlans.placeId, place.id))
    : eq(shootingPlans.ownerId, ownerId);
  return db.select({ id: shootingPlans.id }).from(shootingPlans).where(condition)
    .orderBy(desc(shootingPlans.updatedAt)).limit(100).all()
    .flatMap((row) => { const plan = getPlan(ownerId, row.id); return plan ? [plan] : []; });
}

export function savePlan(ownerId: string, input: CloudPlanInput, existingId?: string, legacyFingerprint?: string): CloudPlanRecord | null {
  const existing = existingId ? db.select().from(shootingPlans).where(and(eq(shootingPlans.id, existingId), eq(shootingPlans.ownerId, ownerId))).get() : null;
  if (existingId && !existing) return null;
  const catalogue = getCataloguePlace(input.plan.locationId);
  if (!catalogue) return null;
  if (!legacyFingerprint && input.plan.coordinateSource === 'catalogue'
      && (input.plan.coordinates[0] !== catalogue.coordinates[0] || input.plan.coordinates[1] !== catalogue.coordinates[1])) return null;
  const place = ensureIllustrativePlace(input.plan.locationId);
  if (!place) return null;
  const planId = existing?.id ?? crypto.randomUUID();
  const vantageId = crypto.randomUUID();
  const subjectId = input.subject ? crypto.randomUUID() : null;
  const source = legacyFingerprint ? 'legacy_import' : input.plan.coordinateSource === 'catalogue' ? 'catalogue_estimate' : input.vantage.source;
  db.transaction((tx) => {
    tx.insert(vantagePoints).values({
      id: vantageId, ownerId, placeId: place.id, name: input.vantage.name,
      longitude: input.plan.coordinates[0], latitude: input.plan.coordinates[1], source,
      horizontalAccuracyM: legacyFingerprint ? null : input.vantage.horizontalAccuracyM,
      elevationM: legacyFingerprint ? null : input.vantage.elevationM,
      verticalDatum: legacyFingerprint ? 'unknown' : input.vantage.verticalDatum,
      cameraHeightM: legacyFingerprint ? null : input.vantage.cameraHeightM,
      verifiedAt: null,
    }).run();
    if (input.subject && subjectId) tx.insert(subjects).values({
      id: subjectId, ownerId, placeId: place.id, name: input.subject.name,
      longitude: input.subject.coordinates[0], latitude: input.subject.coordinates[1],
      source: input.subject.source, horizontalAccuracyM: input.subject.horizontalAccuracyM,
      elevationM: input.subject.elevationM, verticalDatum: input.subject.verticalDatum,
      heightAboveGroundM: input.subject.heightAboveGroundM, verifiedAt: null,
    }).run();
    const fields = {
      workspace: input.workspace === undefined ? existing?.workspace ?? null : input.workspace,
      placeId: place.id, vantagePointId: vantageId, subjectId,
      title: input.plan.name, version: 2, coordinateSource: input.plan.coordinateSource,
      shotAt: locationDateTime(input.plan.dateKey, input.plan.minutes, input.plan.timeZone).toISOString(),
      timeZone: input.plan.timeZone, focalLengthMm: input.plan.focalLength,
      sensor: input.plan.sensor, portrait: input.plan.portrait,
      azimuth: input.plan.azimuth, elevation: input.plan.elevation,
      travelMinutes: input.plan.travelMinutes, setupMinutes: input.plan.setupMinutes,
      notes: input.plan.notes, dataVersion: legacyFingerprint ? 'local-v1-import' : existing?.legacyFingerprint ? 'local-v1-import-edited' : 'catalogue-v1', updatedAt: now(),
    } as const;
    if (existing) {
      tx.update(shootingPlans).set(fields).where(and(eq(shootingPlans.id, planId), eq(shootingPlans.ownerId, ownerId))).run();
      tx.delete(vantagePoints).where(and(eq(vantagePoints.id, existing.vantagePointId), eq(vantagePoints.ownerId, ownerId))).run();
      if (existing.subjectId) tx.delete(subjects).where(and(eq(subjects.id, existing.subjectId), eq(subjects.ownerId, ownerId))).run();
    } else {
      tx.insert(shootingPlans).values({ id: planId, ownerId, ...fields, legacyFingerprint: legacyFingerprint ?? null }).run();
    }
  });
  return getPlan(ownerId, planId);
}

export function deletePlan(ownerId: string, id: string): boolean {
  const existing = db.select().from(shootingPlans).where(and(eq(shootingPlans.id, id), eq(shootingPlans.ownerId, ownerId))).get();
  if (!existing) return false;
  db.transaction((tx) => {
    tx.delete(shootingPlans).where(and(eq(shootingPlans.id, id), eq(shootingPlans.ownerId, ownerId))).run();
    tx.delete(vantagePoints).where(and(eq(vantagePoints.id, existing.vantagePointId), eq(vantagePoints.ownerId, ownerId))).run();
    if (existing.subjectId) tx.delete(subjects).where(and(eq(subjects.id, existing.subjectId), eq(subjects.ownerId, ownerId))).run();
  });
  return true;
}

export function importLegacyPlans(ownerId: string, plans: ShootingPlan[]) {
  let imported = 0;
  let skipped = 0;
  for (const plan of plans) {
    if (!ensureIllustrativePlace(plan.locationId)) { skipped++; continue; }
    const fingerprint = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
    const exists = db.select({ id: shootingPlans.id }).from(shootingPlans)
      .where(and(eq(shootingPlans.ownerId, ownerId), eq(shootingPlans.legacyFingerprint, fingerprint))).get();
    if (exists) { skipped++; continue; }
    savePlan(ownerId, {
      plan, vantage: { name: '旧计划机位（未核验）', source: 'user_input', horizontalAccuracyM: null,
        elevationM: null, verticalDatum: 'unknown', cameraHeightM: null }, subject: null,
    }, undefined, fingerprint);
    imported++;
  }
  return { imported, skipped };
}
