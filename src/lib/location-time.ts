export const DEFAULT_TIME_ZONE = 'Asia/Shanghai';

export function dateKeyAtLocation(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function minutesAtLocation(date: Date, timeZone = DEFAULT_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'hour')!.value) * 60
    + Number(parts.find((p) => p.type === 'minute')!.value);
}

/** Convert a civil date and minute in the location's time zone to an instant. */
export function locationDateTime(dateKey: string, minutes: number, timeZone = DEFAULT_TIME_ZONE): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isFinite(minutes)) {
    throw new Error('无效的地点日期或时间');
  }
  const day = new Date(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== dateKey) throw new Error('无效的地点日期');
  const target = day.getTime() + Math.round(minutes) * 60000;
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const date = new Date(instant);
    const local = Date.parse(`${dateKeyAtLocation(date, timeZone)}T00:00:00Z`)
      + minutesAtLocation(date, timeZone) * 60000;
    instant += target - local;
  }
  return new Date(instant);
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60).toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`;
}
