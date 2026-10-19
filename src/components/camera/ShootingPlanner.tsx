'use client';

import { useState } from 'react';
import { z } from 'zod';
import type { Location } from '@/types/location';
import { useCameraStore } from '@/stores/useCameraStore';
import { useTimeStore } from '@/stores/useTimeStore';
import { formatTime } from '@/lib/astronomy';
import { dateKeyAtLocation } from '@/lib/location-time';
import { shootingPlanSchema, suggestedDeparture, planToGpx, findAlignmentWindows, type AlignmentWindow, type ShootingPlan } from '@/lib/shooting-plan';

const STORAGE_KEY = 'quasarframe.shooting-plans.v1';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ShootingPlanner({ location }: { location: Location }) {
  const camera = useCameraStore();
  const time = useTimeStore();
  const [name, setName] = useState(`${location.name}拍摄计划`);
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [travel, setTravel] = useState('');
  const [setup, setSetup] = useState('30');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState<ShootingPlan[]>([]);
  const [message, setMessage] = useState('');
  const [body, setBody] = useState<'sun' | 'moon'>('sun');
  const [tolerance, setTolerance] = useState('1');
  const [result, setResult] = useState<{ windows: AlignmentWindow[]; plan: ShootingPlan; body: string; tolerance: number } | null>(null);

  function readPlan(): ShootingPlan {
    if (Boolean(longitude.trim()) !== Boolean(latitude.trim())) throw new Error('请同时填写经度和纬度');
    return shootingPlanSchema.parse({
      version: 1, name, locationId: location.id,
      coordinates: longitude.trim() ? [Number(longitude), Number(latitude)] : location.coordinates,
      coordinateSource: longitude.trim() ? 'user' : 'catalogue', coordinateSystem: 'WGS84-assumed',
      dateKey: time.dateKey, minutes: Math.round(time.timeOfDay * 60), timeZone: 'Asia/Shanghai',
      focalLength: camera.focalLength, sensor: camera.sensor, portrait: camera.portrait,
      azimuth: camera.azimuth, elevation: camera.elevation,
      travelMinutes: travel.trim() ? Number(travel) : null, setupMinutes: Number(setup), notes,
    });
  }
  function act(action: (plan: ShootingPlan) => void) {
    try { action(readPlan()); }
    catch (error) { setMessage(error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : '操作失败'); }
  }
  function loadSaved() {
    try {
      const entries = z.array(shootingPlanSchema).max(50).parse(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
      const matching = entries.filter((entry) => entry.locationId === location.id);
      setSaved(matching);
      setMessage(matching.length ? `已读取此地点的 ${matching.length} 份计划` : '此浏览器还没有此地点的计划');
    } catch { setMessage('已保存的数据无法读取，当前表单未被替换'); }
  }
  const inputClass = 'block w-full rounded-lg border border-border bg-card p-2 mt-1';
  const buttonClass = 'rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted';

  return <section className="bg-card rounded-xl p-5 border border-border/30 space-y-4">
    <h3 className="font-semibold">拍摄计划</h3>
    <p className="text-xs text-muted-foreground">使用上方日期、时间与镜头参数。机位坐标留空时使用地点示意坐标；可填入自己的 GPS 坐标。行程时间由你估计，尚未接入路网与天气。</p>
    <label className="block text-sm">计划名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} /></label>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <label>机位经度<input aria-label="机位经度" type="number" min={-180} max={180} step="any" placeholder="GPS 经度（可选）" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} /></label>
      <label>机位纬度<input aria-label="机位纬度" type="number" min={-90} max={90} step="any" placeholder="GPS 纬度（可选）" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} /></label>
      <label>预计行程（分钟）<input type="number" min={0} max={10080} value={travel} placeholder="未知时留空" onChange={(event) => setTravel(event.target.value)} className={inputClass} /></label>
      <label>布置器材（分钟）<input type="number" min={0} max={1440} value={setup} onChange={(event) => setSetup(event.target.value)} className={inputClass} /></label>
    </div>
    <label className="block text-sm">主体、路线与备选方案<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className={inputClass} rows={3} /></label>
    <div className="flex flex-wrap gap-2">
      <button className={buttonClass} onClick={() => act((plan) => {
        const departure = suggestedDeparture(plan);
        setMessage(departure ? `按输入估算，建议 ${dateKeyAtLocation(departure)} ${formatTime(departure)} 出发；尚未考虑路况与通行限制。` : '行程时间未知，无法计算出发时间');
      })}>估算出发时间</button>
      <button className={buttonClass} onClick={() => act((plan) => {
        const previous = z.array(shootingPlanSchema).max(50).parse(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
        const entries = [plan, ...previous].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        setSaved(entries.filter((entry) => entry.locationId === location.id)); setMessage('计划已保存到此浏览器');
      })}>保存到此浏览器</button>
      <button className={buttonClass} onClick={loadSaved}>读取已保存计划</button>
      <button className={buttonClass} onClick={() => act((plan) => download('shooting-plan.json', JSON.stringify(plan, null, 2), 'application/json'))}>导出计划</button>
      <button className={buttonClass} onClick={() => act((plan) => download('shooting-waypoint.gpx', planToGpx(plan), 'application/gpx+xml'))}>导出 GPX 点位</button>
    </div>
    {saved.length > 0 && <ul className="space-y-2 text-xs">{saved.map((plan, index) => <li key={index} className="flex gap-2 items-center">
      <span className="flex-1">{plan.name} · {plan.dateKey}</span>
      <button className={buttonClass} onClick={() => {
        setName(plan.name); setLongitude(plan.coordinateSource === 'user' ? String(plan.coordinates[0]) : ''); setLatitude(plan.coordinateSource === 'user' ? String(plan.coordinates[1]) : '');
        setTravel(plan.travelMinutes === null ? '' : String(plan.travelMinutes)); setSetup(String(plan.setupMinutes)); setNotes(plan.notes);
        time.setDateKey(plan.dateKey); time.setTimeOfDay(plan.minutes / 60);
        camera.setFocalLength(plan.focalLength); camera.setSensor(plan.sensor); camera.setPortrait(plan.portrait); camera.setAzimuth(plan.azimuth); camera.setElevation(plan.elevation);
        setResult(null); setMessage(plan.locationId === location.id ? '已载入计划' : '此计划属于其他地点，请前往原地点使用');
      }}>载入</button>
    </li>)}</ul>}
    <div className="border-t border-border pt-4 space-y-3">
      <h4 className="text-sm font-medium">日月方向对齐</h4>
      <p className="text-xs text-muted-foreground">以上方机位控制的方位角、仰角作为主体方向，在所选日期寻找对齐窗口。角度容差为天体中心与目标方向的距离；1 分钟采样，未计入山脊遮挡和主体轮廓。</p>
      <div className="flex gap-3 items-end text-sm">
        <label>天体<select value={body} onChange={(event) => setBody(event.target.value as 'sun' | 'moon')} className={inputClass}><option value="sun">太阳</option><option value="moon">月亮</option></select></label>
        <label>容差（°）<input type="number" min={0.1} max={10} step={0.1} value={tolerance} onChange={(event) => setTolerance(event.target.value)} className={inputClass} /></label>
        <button className={buttonClass} onClick={() => act((plan) => {
          const windows = findAlignmentWindows(plan, body, Number(tolerance));
          setResult({ windows, plan, body: body === 'sun' ? '太阳' : '月亮', tolerance: Number(tolerance) }); setMessage('已按当前输入计算');
        })}>计算窗口</button>
      </div>
      {result && <div className="text-xs space-y-2">
        <p>{result.plan.dateKey} · {result.body} · 目标 {result.plan.azimuth}° / {result.plan.elevation}° · 容差 {result.tolerance}° · {result.plan.coordinateSource === 'catalogue' ? '地点示意坐标' : '用户输入坐标'} {result.plan.coordinates.join(', ')}</p>
        {result.windows.length ? result.windows.map((window, index) => <p key={index}>{formatTime(window.start)}–{formatTime(window.end)} · 最近 {formatTime(window.best)} · 角距 {window.separation.toFixed(2)}°</p>) : <p>当天未找到理论地平线以上满足容差的采样时刻；这不代表其他日期没有机会。</p>}
        <p>结果对应计算时的输入快照，调整参数后请重新计算。当前不判断现场可见性。</p>
      </div>}
    </div>
    <p role="status" className="text-xs text-muted-foreground">{message}</p>
  </section>;
}
