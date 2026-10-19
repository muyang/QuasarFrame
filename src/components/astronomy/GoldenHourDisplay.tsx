'use client';

import {
  formatTime,
  getMoonPhaseName,
  getMoonPhaseEmoji,
  isGoldenHour,
  minutesToNextGoldenHour,
  type SunMoonData,
} from '@/lib/astronomy';

interface GoldenHourDisplayProps {
  sunMoonData: SunMoonData;
  currentDate: Date;
  timeZone: string;
}

export function GoldenHourDisplay({ sunMoonData, currentDate, timeZone }: GoldenHourDisplayProps) {
  const isGH = isGoldenHour(sunMoonData, currentDate);
  const minutesLeft = minutesToNextGoldenHour(sunMoonData, currentDate);
  const moonEmoji = getMoonPhaseEmoji(sunMoonData.moonPhase);
  const moonPhaseName = getMoonPhaseName(sunMoonData.moonPhase);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">金色时刻</p>

      <div className={`rounded-xl p-4 border ${isGH ? 'border-golden/50 bg-golden/10' : 'border-border/30 bg-card/50'}`}>
        {isGH ? (
          <div className="flex items-center gap-2 text-golden">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-semibold">所选时间处于金色时刻</p>
              <p className="text-xs text-muted-foreground">按理论地平线计算</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              {minutesLeft >= 0
                ? `距下一金色时段还有 ${minutesLeft} 分钟`
                : '今日无更多金色时刻'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">晨间金色时刻</p>
          <p className="font-mono mt-1">
            {formatTime(sunMoonData.goldenHourStart, timeZone)} — {formatTime(sunMoonData.goldenHourEnd, timeZone)}
          </p>
        </div>
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">傍晚金色时刻</p>
          <p className="font-mono mt-1">
            {formatTime(sunMoonData.goldenHourStartEvening, timeZone)} — {formatTime(sunMoonData.goldenHourEndEvening, timeZone)}
          </p>
        </div>
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">日出 / 日落</p>
          <p className="font-mono mt-1">
            {formatTime(sunMoonData.sunrise, timeZone)} / {formatTime(sunMoonData.sunset, timeZone)}
          </p>
        </div>
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">月相</p>
          <p className="mt-1">
            {moonEmoji} {moonPhaseName}
          </p>
        </div>
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">晨间蓝调</p>
          <p className="font-mono mt-1">{sunMoonData.blueHourMorning.map((date) => formatTime(date, timeZone)).join(' — ')}</p>
        </div>
        <div className="rounded-lg bg-card/50 p-3 border border-border/20">
          <p className="text-muted-foreground">傍晚蓝调</p>
          <p className="font-mono mt-1">{sunMoonData.blueHourEvening.map((date) => formatTime(date, timeZone)).join(' — ')}</p>
        </div>
      </div>
    </div>
  );
}
