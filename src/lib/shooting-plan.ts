import { z } from 'zod';
import * as SunCalc from 'suncalc';
import { locationDateTime } from './location-time';

const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, '请输入有效日期');

export const shootingPlanSchema = z.object({
  version: z.literal(1),
  locationId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  coordinateSource: z.enum(['catalogue', 'user']),
  coordinateSystem: z.literal('WGS84-assumed'),
  dateKey: civilDate,
  minutes: z.number().int().min(0).max(1439),
  timeZone: z.literal('Asia/Shanghai'),
  focalLength: z.number().positive().max(2000),
  sensor: z.enum(['fullFrame', 'apsc', 'm43']),
  portrait: z.boolean(),
  azimuth: z.number().min(0).max(360),
  elevation: z.number().min(-90).max(90),
  travelMinutes: z.number().int().min(0).max(10080).nullable(),
  setupMinutes: z.number().int().min(0).max(1440),
  notes: z.string().max(2000),
});
export type ShootingPlan = z.infer<typeof shootingPlanSchema>;

export function suggestedDeparture(plan: ShootingPlan): Date | null {
  if (plan.travelMinutes === null) return null;
  return new Date(locationDateTime(plan.dateKey, plan.minutes, plan.timeZone).getTime()
    - (plan.travelMinutes + plan.setupMinutes) * 60000);
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}

/** A waypoint export, not a computed access route. */
export function planToGpx(plan: ShootingPlan): string {
  const description = plan.coordinateSource === 'catalogue' ? '地点示意坐标，未经现场核验；不是导航路线' : '用户输入坐标，尚未现场核验；不是导航路线';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="QuasarFrame" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="${plan.coordinates[1]}" lon="${plan.coordinates[0]}"><name>${escapeXml(plan.name)}</name><desc>${escapeXml(description)}</desc></wpt></gpx>`;
}

export function angularSeparation(azimuthA: number, altitudeA: number, azimuthB: number, altitudeB: number): number {
  const rad = Math.PI / 180;
  const cosine = Math.sin(altitudeA * rad) * Math.sin(altitudeB * rad)
    + Math.cos(altitudeA * rad) * Math.cos(altitudeB * rad) * Math.cos((azimuthA - azimuthB) * rad);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / rad;
}

export interface AlignmentWindow { start: Date; end: Date; best: Date; separation: number; }

/** Minute resolution directional alignment. No terrain or subject silhouette is inferred. */
export function findAlignmentWindows(plan: ShootingPlan, body: 'sun' | 'moon', tolerance: number): AlignmentWindow[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 10) throw new Error('角度容差应为 0–10°');
  const midnight = locationDateTime(plan.dateKey, 0, plan.timeZone).getTime();
  const windows: AlignmentWindow[] = [];
  let current: AlignmentWindow | null = null;
  for (let minute = 0; minute < 1440; minute++) {
    const date = new Date(midnight + minute * 60000);
    const position = body === 'sun'
      ? SunCalc.getPosition(date, plan.coordinates[1], plan.coordinates[0])
      : SunCalc.getMoonPosition(date, plan.coordinates[1], plan.coordinates[0]);
    const altitude = position.altitude;
    const separation = angularSeparation(position.azimuth, altitude, plan.azimuth, plan.elevation);
    if (altitude >= 0 && separation <= tolerance) {
      if (!current) current = { start: date, end: date, best: date, separation };
      else {
        current.end = date;
        if (separation < current.separation) { current.best = date; current.separation = separation; }
      }
    } else if (current) { windows.push(current); current = null; }
  }
  if (current) windows.push(current);
  return windows;
}
