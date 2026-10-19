'use client';

import { formatTime, type SunMoonData } from '@/lib/astronomy';
import { locationDateTime, formatMinutes } from '@/lib/location-time';

interface Props {
  timeOfDay: number;
  onChange: (hours: number) => void;
  sunMoonData: SunMoonData;
  dateKey: string;
  timeZone: string;
}

export function TimeSlider({ timeOfDay, onChange, sunMoonData: data, dateKey, timeZone }: Props) {
  const midnight = locationDateTime(dateKey, 0, timeZone).getTime();
  const inRange = (instant: Date, start: Date | null, end: Date | null) => !!start && !!end && instant >= start && instant <= end;
  const zone = (minutes: number) => {
    const instant = new Date(midnight + minutes * 60000);
    if (inRange(instant, data.goldenHourStart, data.goldenHourEnd) || inRange(instant, data.goldenHourStartEvening, data.goldenHourEndEvening)) return 'bg-golden/60';
    if (inRange(instant, ...data.blueHourMorning) || inRange(instant, ...data.blueHourEvening)) return 'bg-blue-500/60';
    return inRange(instant, data.sunrise, data.sunset) ? 'bg-foreground/20' : 'bg-primary/20';
  };
  return (
    <div>
      <div className="flex justify-between text-sm mb-2"><span>地点时间 · {timeZone}</span><span className="font-mono">{formatMinutes(timeOfDay * 60)}</span></div>
      <div className="relative flex h-5 rounded-full overflow-hidden bg-muted mb-3">
        {Array.from({ length: 144 }, (_, i) => <div key={i} className={`flex-1 ${zone(i * 10 + 5)}`} />)}
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${timeOfDay / 24 * 100}%` }} />
      </div>
      <input aria-label="拍摄时间" type="range" min={0} max={1439} step={1} value={Math.round(timeOfDay * 60)} onChange={(event) => onChange(Number(event.target.value) / 60)} className="w-full accent-primary" />
      <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>00:00</span><span>日出 {formatTime(data.sunrise, timeZone)}</span><span>日落 {formatTime(data.sunset, timeZone)}</span><span>23:59</span></div>
      <p className="text-xs text-muted-foreground mt-2">金色：日出至太阳高度 +6° / +6° 至日落 · 蓝色：太阳高度 −8° 至 −4°</p>
    </div>
  );
}
