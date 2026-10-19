import { useMemo } from 'react';
import { getSunMoonData, type SunMoonData } from '@/lib/astronomy';

export function useSunCalc(
  coordinates: [number, number],
  date: Date,
  timeZone = 'Asia/Shanghai'
): SunMoonData {
  const lng = coordinates[0];
  const lat = coordinates[1];
  const ts = date.getTime();
  return useMemo(
    () => getSunMoonData(lat, lng, new Date(ts), timeZone),
    [lat, lng, ts, timeZone]
  );
}
