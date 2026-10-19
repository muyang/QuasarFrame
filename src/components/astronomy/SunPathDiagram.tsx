'use client';

import { useMemo } from 'react';
import { getSunPath, type SunMoonData } from '@/lib/astronomy';
import { dateKeyAtLocation, locationDateTime } from '@/lib/location-time';

interface Props {
  sunMoonData: SunMoonData;
  timeOfDay: number;
  coordinates: [number, number];
  date: Date;
  timeZone: string;
}

export function SunPathDiagram({ sunMoonData, timeOfDay, coordinates, date, timeZone }: Props) {
  const day = dateKeyAtLocation(date, timeZone);
  const [lng, lat] = coordinates;
  const path = useMemo(() => getSunPath([lng, lat], locationDateTime(day, 720, timeZone), timeZone), [lng, lat, day, timeZone]);
  // Round SVG coordinates to prevent platform floating-point noise during hydration.
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const x = (minutes: number) => round(28 + minutes / 1440 * 264);
  const y = (altitude: number) => round(110 - altitude / 90 * 75);
  const pathD = path.map((point, i) => `${i ? 'L' : 'M'} ${x(point.minutes)} ${y(point.altitude)}`).join(' ');
  return (
    <div>
      <p className="text-sm font-medium mb-2">太阳高度全天轨迹</p>
      <svg viewBox="0 0 320 210" role="img" aria-label="所选地点与日期的太阳高度轨迹" className="w-full">
        {[-90, 0, 90].map((altitude) => <g key={altitude}>
          <line x1="28" x2="292" y1={y(altitude)} y2={y(altitude)} stroke="currentColor" opacity="0.15" />
          <text x="0" y={y(altitude) + 3} fontSize="9" fill="currentColor">{altitude}°</text>
        </g>)}
        <path d={pathD} fill="none" stroke="var(--golden)" strokeWidth="2" />
        <circle cx={x(timeOfDay * 60)} cy={y(sunMoonData.sunPosition.altitude)} r="4" fill="var(--golden)" />
        {[0, 6, 12, 18, 24].map((hour) => <text key={hour} x={x(hour * 60)} y="201" textAnchor="middle" fontSize="9" fill="currentColor">{hour}:00</text>)}
      </svg>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>☀ 方位 {sunMoonData.sunPosition.azimuth.toFixed(1)}° · 高度 {sunMoonData.sunPosition.altitude.toFixed(1)}°</p>
        <p>☾ 方位 {sunMoonData.moonPosition.azimuth.toFixed(1)}° · 高度 {sunMoonData.moonPosition.altitude.toFixed(1)}°</p>
        <p>{timeZone} · 理论地平线，未考虑山脊、建筑和树木遮挡</p>
      </div>
    </div>
  );
}
