'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { Location } from '@/types/location';
import { useCameraStore } from '@/stores/useCameraStore';
import { useTimeStore } from '@/stores/useTimeStore';
import { formatTime } from '@/lib/astronomy';
import { dateKeyAtLocation } from '@/lib/location-time';
import { shootingPlanSchema, suggestedDeparture, planToGpx, findAlignmentWindows, type AlignmentWindow, type ShootingPlan } from '@/lib/shooting-plan';
import { cloudPlanInputSchema, type CloudPlanRecord } from '@/lib/cloud-plan';

const STORAGE_KEY = 'quasarframe.shooting-plans.v1';
const numberOrNull = (value: string) => value.trim() ? Number(value) : null;

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '请求失败');
  return body as T;
}

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
  const [vantageName, setVantageName] = useState(`${location.name}机位`);
  const [vantageSource, setVantageSource] = useState<'user_input' | 'gps'>('user_input');
  const [vantageAccuracy, setVantageAccuracy] = useState('');
  const [vantageElevation, setVantageElevation] = useState('');
  const [vantageDatum, setVantageDatum] = useState<'unknown' | 'WGS84_ellipsoid' | 'EGM96'>('unknown');
  const [cameraHeight, setCameraHeight] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectSource, setSubjectSource] = useState<'user_input' | 'gps'>('user_input');
  const [subjectLongitude, setSubjectLongitude] = useState('');
  const [subjectLatitude, setSubjectLatitude] = useState('');
  const [subjectAccuracy, setSubjectAccuracy] = useState('');
  const [subjectElevation, setSubjectElevation] = useState('');
  const [subjectDatum, setSubjectDatum] = useState<'unknown' | 'WGS84_ellipsoid' | 'EGM96'>('unknown');
  const [subjectHeight, setSubjectHeight] = useState('');
  const [saved, setSaved] = useState<CloudPlanRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [body, setBody] = useState<'sun' | 'moon'>('sun');
  const [tolerance, setTolerance] = useState('1');
  const [result, setResult] = useState<{ windows: AlignmentWindow[]; plan: ShootingPlan; body: string; tolerance: number } | null>(null);

  useEffect(() => {
    let active = true;
    apiJson<{ plans: CloudPlanRecord[] }>(`/api/plans?locationId=${encodeURIComponent(location.id)}`)
      .then((data) => { if (active) setSaved(data.plans); })
      .catch(() => { if (active) setSaved([]); });
    return () => { active = false; };
  }, [location.id]);

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
  async function loadSaved() {
    try {
      const data = await apiJson<{ plans: CloudPlanRecord[] }>(`/api/plans?locationId=${encodeURIComponent(location.id)}`);
      setSaved(data.plans);
      setMessage(data.plans.length ? `已读取此地点的 ${data.plans.length} 份云端计划` : '云端暂无此地点的计划');
    } catch (error) { setMessage(error instanceof Error ? error.message : '读取失败'); }
  }
  function readCloudInput(plan: ShootingPlan) {
    const subjectFilled = [subjectName, subjectLongitude, subjectLatitude, subjectAccuracy, subjectElevation, subjectHeight].some((value) => value.trim())
      || subjectDatum !== 'unknown' || subjectSource !== 'user_input';
    if (subjectFilled && (!subjectName.trim() || !subjectLongitude.trim() || !subjectLatitude.trim())) throw new Error('主体名称、经度和纬度需同时填写');
    return cloudPlanInputSchema.parse({
      plan,
      vantage: {
        name: vantageName, source: vantageSource,
        horizontalAccuracyM: numberOrNull(vantageAccuracy), elevationM: numberOrNull(vantageElevation),
        verticalDatum: vantageDatum, cameraHeightM: numberOrNull(cameraHeight),
      },
      subject: subjectFilled ? {
        name: subjectName, coordinates: [Number(subjectLongitude), Number(subjectLatitude)], source: subjectSource,
        horizontalAccuracyM: numberOrNull(subjectAccuracy), elevationM: numberOrNull(subjectElevation),
        verticalDatum: subjectDatum, heightAboveGroundM: numberOrNull(subjectHeight),
      } : null,
    });
  }
  async function saveCloud() {
    try {
      const input = readCloudInput(readPlan());
      await apiJson(editingId ? `/api/plans/${editingId}` : '/api/plans', {
        method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(input),
      });
      await loadSaved();
      setMessage(editingId ? '云端计划已更新；坐标仍未核验' : '计划已保存到云端；坐标仍未核验');
    } catch (error) { setMessage(error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : '保存失败'); }
  }
  async function importLegacy() {
    try {
      const plans = z.array(shootingPlanSchema).max(50).parse(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
      if (!plans.length) { setMessage('此浏览器没有旧版计划'); return; }
      const result = await apiJson<{ imported: number; skipped: number }>('/api/plans/import', {
        method: 'POST', body: JSON.stringify({ plans }),
      });
      await loadSaved();
      setMessage(`已导入 ${result.imported} 份旧计划，跳过 ${result.skipped} 份；坐标均标记为未核验。旧浏览器副本已保留。`);
    } catch (error) { setMessage(error instanceof z.ZodError ? '旧版计划格式有误，未导入' : error instanceof Error ? error.message : '导入失败'); }
  }
  function loadRecord(record: CloudPlanRecord) {
    const plan = record.plan;
    const differsFromCatalogue = plan.coordinates[0] !== location.coordinates[0] || plan.coordinates[1] !== location.coordinates[1];
    const showCoordinates = plan.coordinateSource === 'user' || differsFromCatalogue;
    setEditingId(record.id);
    setName(plan.name); setLongitude(showCoordinates ? String(plan.coordinates[0]) : ''); setLatitude(showCoordinates ? String(plan.coordinates[1]) : '');
    setTravel(plan.travelMinutes === null ? '' : String(plan.travelMinutes)); setSetup(String(plan.setupMinutes)); setNotes(plan.notes);
    setVantageName(record.vantage.name); setVantageSource(record.vantage.source === 'gps' ? 'gps' : 'user_input');
    setVantageAccuracy(record.vantage.horizontalAccuracyM === null ? '' : String(record.vantage.horizontalAccuracyM));
    setVantageElevation(record.vantage.elevationM === null ? '' : String(record.vantage.elevationM));
    setVantageDatum(record.vantage.verticalDatum); setCameraHeight(record.vantage.cameraHeightM === null ? '' : String(record.vantage.cameraHeightM));
    setSubjectName(record.subject?.name ?? ''); setSubjectLongitude(record.subject ? String(record.subject.coordinates[0]) : '');
    setSubjectLatitude(record.subject ? String(record.subject.coordinates[1]) : '');
    setSubjectSource(record.subject?.source === 'gps' ? 'gps' : 'user_input');
    setSubjectAccuracy(record.subject?.horizontalAccuracyM == null ? '' : String(record.subject.horizontalAccuracyM));
    setSubjectElevation(record.subject?.elevationM == null ? '' : String(record.subject.elevationM));
    setSubjectDatum(record.subject?.verticalDatum ?? 'unknown'); setSubjectHeight(record.subject?.heightAboveGroundM == null ? '' : String(record.subject.heightAboveGroundM));
    time.setDateKey(plan.dateKey); time.setTimeOfDay(plan.minutes / 60);
    camera.setFocalLength(plan.focalLength); camera.setSensor(plan.sensor); camera.setPortrait(plan.portrait);
    camera.setAzimuth(plan.azimuth); camera.setElevation(plan.elevation);
    setResult(null); setMessage(differsFromCatalogue && plan.coordinateSource === 'catalogue'
      ? '已载入旧目录坐标。该坐标与现行示意目录不同，更新时将按手工输入坐标保存；请核对。'
      : '已载入云端计划；编辑后点击“更新云端计划”');
  }
  const inputClass = 'block w-full rounded-lg border border-border bg-card p-2 mt-1';
  const buttonClass = 'rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted';

  return <section className="bg-card rounded-xl p-5 border border-border/30 space-y-4">
    <h3 className="font-semibold">拍摄计划</h3>
    <p className="text-xs text-muted-foreground">使用上方日期、时间与镜头参数。机位坐标留空时使用地点示意坐标；可填入自己的 GPS 坐标。所有新建或导入坐标均为未核验，精度和高程基准由你填写。行程时间由你估计，尚未接入路网与天气。</p>
    <label className="block text-sm">计划名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} /></label>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <label>机位经度<input aria-label="机位经度" type="number" min={-180} max={180} step="any" placeholder="GPS 经度（可选）" value={longitude} onChange={(event) => setLongitude(event.target.value)} className={inputClass} /></label>
      <label>机位纬度<input aria-label="机位纬度" type="number" min={-90} max={90} step="any" placeholder="GPS 纬度（可选）" value={latitude} onChange={(event) => setLatitude(event.target.value)} className={inputClass} /></label>
      <label>预计行程（分钟）<input type="number" min={0} max={10080} value={travel} placeholder="未知时留空" onChange={(event) => setTravel(event.target.value)} className={inputClass} /></label>
      <label>布置器材（分钟）<input type="number" min={0} max={1440} value={setup} onChange={(event) => setSetup(event.target.value)} className={inputClass} /></label>
    </div>
    <details className="text-sm border border-border rounded-lg p-3 space-y-3">
      <summary className="cursor-pointer font-medium">机位与主体坐标详情（可选）</summary>
      <div className="grid grid-cols-2 gap-3 pt-3">
        <label className="col-span-2">机位名称<input value={vantageName} onChange={(event) => setVantageName(event.target.value)} maxLength={120} className={inputClass} /></label>
        <label>机位坐标来源<select value={vantageSource} onChange={(event) => setVantageSource(event.target.value as 'user_input' | 'gps')} className={inputClass}><option value="user_input">手工输入</option><option value="gps">GPS 记录</option></select></label>
        <label>机位水平误差（米）<input type="number" min={0} step="any" value={vantageAccuracy} onChange={(event) => setVantageAccuracy(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
        <label>机位海拔（米）<input type="number" step="any" value={vantageElevation} onChange={(event) => setVantageElevation(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
        <label>机位高程基准<select value={vantageDatum} onChange={(event) => setVantageDatum(event.target.value as typeof vantageDatum)} className={inputClass}><option value="unknown">未知</option><option value="WGS84_ellipsoid">WGS84 椭球高</option><option value="EGM96">EGM96 正高</option></select></label>
        <label>相机离地高度（米）<input type="number" min={0} step="any" value={cameraHeight} onChange={(event) => setCameraHeight(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <label className="col-span-2">主体名称<input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} maxLength={120} placeholder="不指定主体可留空" className={inputClass} /></label>
        <label>主体经度<input type="number" min={-180} max={180} step="any" value={subjectLongitude} onChange={(event) => setSubjectLongitude(event.target.value)} className={inputClass} /></label>
        <label>主体纬度<input type="number" min={-90} max={90} step="any" value={subjectLatitude} onChange={(event) => setSubjectLatitude(event.target.value)} className={inputClass} /></label>
        <label>主体坐标来源<select value={subjectSource} onChange={(event) => setSubjectSource(event.target.value as 'user_input' | 'gps')} className={inputClass}><option value="user_input">手工输入</option><option value="gps">GPS 记录</option></select></label>
        <label>主体水平误差（米）<input type="number" min={0} step="any" value={subjectAccuracy} onChange={(event) => setSubjectAccuracy(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
        <label>主体海拔（米）<input type="number" step="any" value={subjectElevation} onChange={(event) => setSubjectElevation(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
        <label>主体高程基准<select value={subjectDatum} onChange={(event) => setSubjectDatum(event.target.value as typeof subjectDatum)} className={inputClass}><option value="unknown">未知</option><option value="WGS84_ellipsoid">WGS84 椭球高</option><option value="EGM96">EGM96 正高</option></select></label>
        <label>主体离地高度（米）<input type="number" min={0} step="any" value={subjectHeight} onChange={(event) => setSubjectHeight(event.target.value)} placeholder="未知留空" className={inputClass} /></label>
      </div>
      <p className="text-xs text-muted-foreground pt-2">坐标系统按 WGS84 暂定。填写来源或误差不等于现场核验；后续地形计算需匹配高程基准。</p>
    </details>
    <label className="block text-sm">主体、路线与备选方案<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className={inputClass} rows={3} /></label>
    <div className="flex flex-wrap gap-2">
      <button className={buttonClass} onClick={() => act((plan) => {
        const departure = suggestedDeparture(plan);
        setMessage(departure ? `按输入估算，建议 ${dateKeyAtLocation(departure)} ${formatTime(departure)} 出发；尚未考虑路况与通行限制。` : '行程时间未知，无法计算出发时间');
      })}>估算出发时间</button>
      <button className={buttonClass} onClick={saveCloud}>{editingId ? '更新云端计划' : '保存到云端'}</button>
      {editingId && <button className={buttonClass} onClick={() => { setEditingId(null); setMessage('下一次保存将新建云端计划'); }}>另存为新计划</button>}
      <button className={buttonClass} onClick={loadSaved}>读取云端计划</button>
      <button className={buttonClass} onClick={importLegacy}>导入此浏览器旧计划</button>
      <button className={buttonClass} onClick={() => act((plan) => download('shooting-plan.json', JSON.stringify(plan, null, 2), 'application/json'))}>导出计划</button>
      <button className={buttonClass} onClick={() => act((plan) => download('shooting-waypoint.gpx', planToGpx(plan), 'application/gpx+xml'))}>导出 GPX 点位</button>
    </div>
    {saved.length > 0 && <ul className="space-y-2 text-xs">{saved.map((record) => <li key={record.id} className="flex gap-2 items-center">
      <span className="flex-1">{record.plan.name} · {record.plan.dateKey} · {record.dataVersion.startsWith('local-v1-import') ? '旧计划导入 · ' : ''}{record.vantage.source === 'catalogue_estimate' ? '目录示意' : record.vantage.source === 'legacy_import' ? '原始坐标' : record.vantage.source === 'gps' ? 'GPS 记录' : '手工坐标'} · <strong>未核验</strong>{record.subject ? ` · 主体：${record.subject.name}（未核验）` : ''}</span>
      <button className={buttonClass} onClick={() => loadRecord(record)}>载入</button>
      <button className={buttonClass} onClick={async () => {
        try {
          await apiJson(`/api/plans/${record.id}`, { method: 'DELETE' });
          if (editingId === record.id) setEditingId(null);
          await loadSaved(); setMessage('云端计划已删除');
        } catch (error) { setMessage(error instanceof Error ? error.message : '删除失败'); }
      }}>删除</button>
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
