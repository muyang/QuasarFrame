import * as SunCalc from 'suncalc';
import { DEFAULT_TIME_ZONE, dateKeyAtLocation, locationDateTime } from './location-time';

// Photography convention: blue hour spans solar altitude -8° to -4°.
SunCalc.addTime(-8, 'blueMorningStart', 'blueEveningEnd');
SunCalc.addTime(-4, 'blueMorningEnd', 'blueEveningStart');

export interface SunMoonData {
  blueHourMorning: [Date | null, Date | null];
  blueHourEvening: [Date | null, Date | null];
  sunrise: Date | null;
  sunset: Date | null;
  goldenHourStart: Date | null;
  goldenHourEnd: Date | null;
  goldenHourStartEvening: Date | null;
  goldenHourEndEvening: Date | null;
  sunPosition: { azimuth: number; altitude: number };
  moonPosition: { azimuth: number; altitude: number };
  moonPhase: number; // 0 = new moon, 0.5 = full moon
  solarNoon: Date | null;
  nadir: Date | null;
  dawn: Date | null;
  dusk: Date | null;
}

export function getSunMoonData(
  lat: number,
  lng: number,
  date: Date,
  timeZone = DEFAULT_TIME_ZONE
): SunMoonData {
  // Anchor events at local noon, independent of the selected hour and host time zone.
  const times = SunCalc.getTimes(locationDateTime(dateKeyAtLocation(date, timeZone), 720, timeZone), lat, lng);
  const sunPos = SunCalc.getPosition(date, lat, lng);
  const moonPos = SunCalc.getMoonPosition(date, lat, lng);
  const moonIllum = SunCalc.getMoonIllumination(date);

  return {
    blueHourMorning: [validEvent(times.blueMorningStart), validEvent(times.blueMorningEnd)],
    blueHourEvening: [validEvent(times.blueEveningStart), validEvent(times.blueEveningEnd)],
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenHourStart: times.sunrise,
    goldenHourEnd: times.goldenHourEnd,
    goldenHourStartEvening: times.goldenHour,
    goldenHourEndEvening: times.sunset,
    sunPosition: {
      // SunCalc 2 returns degrees clockwise from north (unlike version 1).
      azimuth: sunPos.azimuth,
      altitude: sunPos.altitude,
    },
    moonPosition: {
      azimuth: moonPos.azimuth,
      altitude: moonPos.altitude,
    },
    moonPhase: moonIllum.phase,
    solarNoon: times.solarNoon,
    nadir: times.nadir,
    dawn: times.dawn,
    dusk: times.dusk,
  };
}

function validEvent(value: unknown): Date | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null;
}

export function formatTime(date: Date | null, timeZone = DEFAULT_TIME_ZONE): string {
  if (!date || !Number.isFinite(date.getTime())) return '--:--';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  });
}

export function getSunPath(coordinates: [number, number], date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const day = dateKeyAtLocation(date, timeZone);
  return Array.from({ length: 145 }, (_, index) => {
    const minutes = index * 10;
    const position = SunCalc.getPosition(locationDateTime(day, minutes, timeZone), coordinates[1], coordinates[0]);
    return { minutes, altitude: position.altitude, azimuth: position.azimuth };
  });
}

export function getMoonPhaseName(phase: number): string {
  if (phase < 0.0625) return '新月';
  if (phase < 0.1875) return '蛾眉月';
  if (phase < 0.3125) return '上弦月';
  if (phase < 0.4375) return '盈凸月';
  if (phase < 0.5625) return '满月';
  if (phase < 0.6875) return '亏凸月';
  if (phase < 0.8125) return '下弦月';
  if (phase < 0.9375) return '残月';
  return '新月';
}

export function getMoonPhaseEmoji(phase: number): string {
  if (phase < 0.0625) return '🌑';
  if (phase < 0.1875) return '🌒';
  if (phase < 0.3125) return '🌓';
  if (phase < 0.4375) return '🌔';
  if (phase < 0.5625) return '🌕';
  if (phase < 0.6875) return '🌖';
  if (phase < 0.8125) return '🌗';
  if (phase < 0.9375) return '🌘';
  return '🌑';
}

/** Check if current time is within golden hour */
export function isGoldenHour(data: SunMoonData, now: Date): boolean {
  const isMorning =
    data.goldenHourStart &&
    data.goldenHourEnd &&
    now >= data.goldenHourStart &&
    now <= data.goldenHourEnd;
  const isEvening =
    data.goldenHourStartEvening &&
    data.goldenHourEndEvening &&
    now >= data.goldenHourStartEvening &&
    now <= data.goldenHourEndEvening;
  return !!isMorning || !!isEvening;
}

/** Minutes until next golden hour */
export function minutesToNextGoldenHour(data: SunMoonData, now: Date): number {
  const targets = [
    data.goldenHourStart,
    data.goldenHourStartEvening,
  ].filter(Boolean) as Date[];

  const future = targets.filter((t) => t > now).sort((a, b) => a.getTime() - b.getTime());
  if (future.length === 0) return -1; // none today
  return Math.round((future[0].getTime() - now.getTime()) / 60000);
}
