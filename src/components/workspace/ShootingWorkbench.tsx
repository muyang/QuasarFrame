'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { locations } from '@/data/locations';
import { cloudPlanInputSchema, vantageInputSchema, subjectInputSchema, type CloudPlanInput, type CloudPlanRecord } from '@/lib/cloud-plan';
import { dateKeyAtLocation, locationDateTime } from '@/lib/location-time';
import { findAlignmentWindows, shootingPlanSchema } from '@/lib/shooting-plan';
import { NASA_SOURCE_URL, type ShootingWorkspace } from '@/lib/shooting-workspace';
import type { TerrainAnalysisResult } from '@/lib/terrain-analysis';
import { useCameraStore } from '@/stores/useCameraStore';
import { useTimeStore } from '@/stores/useTimeStore';
import { useSunCalc } from '@/hooks/useSunCalc';
import { CameraControls } from '@/components/camera/CameraControls';
import { CameraSimulator } from '@/components/camera/CameraSimulator';
import { SunPathDiagram } from '@/components/astronomy/SunPathDiagram';
import { GoldenHourDisplay } from '@/components/astronomy/GoldenHourDisplay';
import { TimeSlider } from '@/components/astronomy/TimeSlider';
import { GeoLibreMap } from './GeoLibreMap';
import { formatTime } from '@/lib/astronomy';

const fallbackLocation = locations.find((item) => item.id === 'niubei')!;
function freshDraft(locationId: string): CloudPlanInput & { workspace: ShootingWorkspace } {
  const location = locations.find((item) => item.id === locationId) ?? fallbackLocation;
  return {
    plan: { version: 1, locationId: location.id, name: `${location.name}拍摄项目`, coordinates: location.coordinates,
      coordinateSource: 'catalogue', coordinateSystem: 'WGS84-assumed', dateKey: dateKeyAtLocation(new Date()), minutes: 1080,
      timeZone: 'Asia/Shanghai', focalLength: 35, sensor: 'fullFrame', portrait: false, azimuth: 180, elevation: 15,
      travelMinutes: null, setupMinutes: 30, notes: '' },
    vantage: vantageInputSchema.parse({ name: `${location.name}待核验机位`, cameraHeightM: 1.6 }), subject: null,
    workspace: { version: 1, intent: 'landscape', projection: 'globe', viewport: { center: location.coordinates, zoom: 4, bearing: 0, pitch: 0 } },
  };
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(response.status === 401 ? '请先登录，再保存或打开云端项目' : body.error || '请求失败');
  return body;
}
function applyControls(plan: CloudPlanInput['plan']) {
  useCameraStore.setState({ focalLength: plan.focalLength, sensor: plan.sensor, portrait: plan.portrait, azimuth: plan.azimuth, elevation: plan.elevation });
  useTimeStore.setState({ dateKey: plan.dateKey, timeOfDay: plan.minutes / 60 });
}
const visibility = (value?: { status: string; clear?: boolean }) => value?.status === 'theoretical'
  ? value.clear ? '理论无遮挡' : '理论受地形遮挡' : '覆盖或基准不足，无法判断';
const terrainLabels: Record<TerrainAnalysisResult['status'], string> = {
  theoretical_only: '真实 DEM · 理论估算', partial_coverage: '地形覆盖不完整', outside_coverage: '机位超出地形覆盖',
  datum_mismatch: '高程基准不一致', illustrative_coordinate_mismatch: '目录点与高程不符，请校准机位',
};

export function ShootingWorkbench({ initialLocation }: { initialLocation: string }) {
  const [draft, setDraft] = useState(() => freshDraft(initialLocation));
  const [id, setId] = useState<string | null>(null);
  const [saved, setSaved] = useState<CloudPlanRecord[]>([]);
  const [savedFingerprint, setSavedFingerprint] = useState('');
  const [message, setMessage] = useState('先选区，再确定机位和时间。目录点为示意，所有新机位均待核验。');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'map' | 'preview' | 'astronomy'>('map');
  const [mapRevision, setMapRevision] = useState(0);
  const [analysis, setAnalysis] = useState<{ key: string; result: TerrainAnalysisResult } | null>(null);
  const [terrainBusy, setTerrainBusy] = useState(false);
  const [replaceAction, setReplaceAction] = useState<(() => void) | null>(null);
  const camera = useCameraStore();
  const time = useTimeStore();
  useEffect(() => { applyControls(freshDraft(initialLocation).plan); }, [initialLocation]);
  const plan = { ...draft.plan, dateKey: time.dateKey, minutes: Math.round(time.timeOfDay * 60), focalLength: camera.focalLength,
    sensor: camera.sensor, portrait: camera.portrait, azimuth: camera.azimuth, elevation: camera.elevation };
  const input = { ...draft, plan };
  const fingerprint = JSON.stringify(input);
  const dirty = fingerprint !== savedFingerprint;
  const location = locations.find((item) => item.id === plan.locationId) ?? fallbackLocation;
  const currentDate = locationDateTime(plan.dateKey, plan.minutes, plan.timeZone);
  const sun = useSunCalc(plan.coordinates, currentDate, plan.timeZone);
  const terrainRequest = {
    vantage: { coordinates: plan.coordinates, coordinateSource: plan.coordinateSource, cameraHeightM: draft.vantage.cameraHeightM ?? 1.6,
      elevationM: draft.vantage.elevationM, verticalDatum: draft.vantage.verticalDatum },
    subject: draft.subject ? { coordinates: draft.subject.coordinates, elevationM: draft.subject.elevationM,
      verticalDatum: draft.subject.verticalDatum, heightAboveGroundM: draft.subject.heightAboveGroundM ?? 0 } : null,
    azimuthDeg: plan.azimuth, at: currentDate.toISOString(),
  };
  const analysisKey = JSON.stringify({ locationId: location.id, ...terrainRequest });
  const activeAnalysis = analysis?.key === analysisKey ? analysis.result : null;
  const validPlan = shootingPlanSchema.safeParse(plan);
  const windows = tab === 'astronomy' && validPlan.success ? findAlignmentWindows(validPlan.data, 'moon', 1) : [];
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && id) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, id]);
  function replace(action: () => void) {
    if (dirty) setReplaceAction(() => action); else action();
  }
  function changeLocation(locationId: string) {
    const next = freshDraft(locationId);
    setDraft(next); applyControls(next.plan); setId(null); setSavedFingerprint(''); setAnalysis(null); setMapRevision((value) => value + 1);
    setMessage('已新建项目；地点目录点为示意，请确定实际机位。');
  }
  function loadRecord(record: CloudPlanRecord) {
    const next = { plan: record.plan,
      vantage: vantageInputSchema.parse({ name: record.vantage.name, source: record.vantage.source === 'gps' ? 'gps' : 'user_input',
        horizontalAccuracyM: record.vantage.horizontalAccuracyM, elevationM: record.vantage.elevationM,
        verticalDatum: record.vantage.verticalDatum, cameraHeightM: record.vantage.cameraHeightM }),
      subject: record.subject ? subjectInputSchema.parse({ name: record.subject.name, coordinates: record.subject.coordinates,
        source: record.subject.source === 'gps' ? 'gps' : 'user_input', horizontalAccuracyM: record.subject.horizontalAccuracyM,
        elevationM: record.subject.elevationM, verticalDatum: record.subject.verticalDatum, heightAboveGroundM: record.subject.heightAboveGroundM }) : null,
      workspace: record.workspace ?? { ...freshDraft(record.plan.locationId).workspace, viewport: { center: record.plan.coordinates, zoom: 6, bearing: 0, pitch: 0 } },
    };
    setDraft(next); applyControls(record.plan); setId(record.id); setSavedFingerprint(JSON.stringify(next)); setAnalysis(null); setMapRevision((value) => value + 1);
    setMessage('已恢复项目机位、主体、镜头、时间和地图视角。地形结果需重新分析。');
  }
  async function save() {
    setBusy(true);
    try {
      const data = cloudPlanInputSchema.parse(input);
      const response = await api<{ plan: CloudPlanRecord }>(id ? `/api/plans/${id}` : '/api/plans', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      setId(response.plan.id); setSavedFingerprint(fingerprint); setMessage('项目已保存到本人账户。机位与主体仍待现场核验。');
      setSaved((items) => [response.plan, ...items.filter((item) => item.id !== response.plan.id)]);
    } catch (error) { setMessage(error instanceof z.ZodError ? error.issues[0].message : (error as Error).message); }
    finally { setBusy(false); }
  }
  async function list() {
    try { const data = await api<{ plans: CloudPlanRecord[] }>('/api/plans'); setSaved(data.plans); setMessage(data.plans.length ? '选择下方项目恢复' : '当前账户暂无云端项目'); }
    catch (error) { setMessage((error as Error).message); }
  }
  async function analyze() {
    setTerrainBusy(true);
    try {
      const result = await api<TerrainAnalysisResult>(`/api/terrain/${location.id}/analysis`, { method: 'POST', body: JSON.stringify(terrainRequest) });
      setAnalysis({ key: analysisKey, result }); setMessage('分析已完成；结果仅适用于分析时的机位、主体、方向和时间。');
    } catch (error) { setAnalysis(null); setMessage((error as Error).message); }
    finally { setTerrainBusy(false); }
  }
  function setPoint(kind: 'vantage' | 'subject', coordinates: [number, number]) {
    setDraft((value) => kind === 'vantage' ? { ...value, plan: { ...value.plan, coordinates, coordinateSource: 'user' },
      vantage: vantageInputSchema.parse({ name: '待核验机位', cameraHeightM: value.vantage.cameraHeightM }) }
      : { ...value, subject: subjectInputSchema.parse({ name: '待核验主体', coordinates }) });
    setMapRevision((value) => value + 1);
    setMessage('选点已应用；原点的高程、误差和 GPS 来源已清空，避免沿用错误证据。');
  }
  return <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-24">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs tracking-[.25em] text-primary mb-2">QUASARFRAME / FIELD STUDIO</p><h1 className="text-2xl md:text-3xl font-semibold">拍摄工作台</h1><p className="text-sm text-muted-foreground mt-2">选地点 → 定机位 → 预演构图 → 安排拍摄</p></div>
      <div className="flex flex-wrap gap-2"><button className="workbench-button" onClick={() => void list()}>打开云端项目</button><button disabled={busy} className="workbench-button bg-primary text-primary-foreground" onClick={() => void save()}>{busy ? '保存中…' : id ? '更新项目' : '保存项目'}</button><Link href="/auth/login?callbackUrl=/scout" className="workbench-button">账户登录</Link></div>
    </header>
    <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 rounded-xl border border-border p-4 bg-card">
      <label className="text-xs">项目名称<input className="workbench-input" value={plan.name} maxLength={120} onChange={(event) => setDraft({ ...draft, plan: { ...draft.plan, name: event.target.value } })} /></label>
      <label className="text-xs">地点 / 新建项目<select className="workbench-input" value={location.id} onChange={(event) => { const value = event.target.value; replace(() => changeLocation(value)); }}>{locations.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.province}</option>)}</select></label>
      <label className="text-xs">拍摄题材<select className="workbench-input" value={draft.workspace.intent} onChange={(event) => setDraft({ ...draft, workspace: { ...draft.workspace, intent: event.target.value as 'landscape' | 'astro' } })}><option value="landscape">风光</option><option value="astro">星空</option></select></label>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{message} <span className="text-primary">{id ? dirty ? '有未保存修改' : '已保存' : '尚未保存'}</span></p>
    {replaceAction && <div role="alert" className="rounded-xl border border-amber-500 p-4 space-x-3"><span>切换会放弃当前未保存修改。</span><button className="workbench-button" onClick={() => { replaceAction(); setReplaceAction(null); }}>放弃修改并切换</button><button className="workbench-button" onClick={() => setReplaceAction(null)}>保留当前项目</button></div>}
    {saved.length > 0 && <div className="flex flex-wrap gap-2">{saved.map((record) => <button className="workbench-button" key={record.id} onClick={() => replace(() => loadRecord(record))}>{record.plan.name} · {record.plan.dateKey}</button>)}</div>}
    <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="拍摄视图">{([['map', '① 地图选点'], ['preview', '② 几何预演'], ['astronomy', '③ 日月与时机']] as const).map(([value, title]) => <button role="tab" aria-selected={tab === value} key={value} className={`workbench-button ${tab === value ? 'bg-primary/20 border-primary' : ''}`} onClick={() => setTab(value)}>{title}</button>)}</div>
        <div hidden={tab !== 'map'} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3"><label className="text-xs">地图视图 <select aria-label="地图视图" className="workbench-button" value={draft.workspace.projection} onChange={(event) => { setDraft({ ...draft, workspace: { ...draft.workspace, projection: event.target.value as 'globe' | 'mercator' } }); setMapRevision((value) => value + 1); }}><option value="globe">球面概览</option><option value="mercator">2D 平面</option></select></label><span className="text-xs text-muted-foreground">球面概览不是立体山体；局部地形见几何预演</span></div>
          <GeoLibreMap key={mapRevision} initial={draft.workspace} vantage={plan.coordinates} subject={draft.subject?.coordinates ?? null}
            onView={(viewport) => setDraft((value) => ({ ...value, workspace: { ...value.workspace, viewport } }))}
            onPick={(kind, view) => { setDraft((value) => ({ ...value, workspace: { ...value.workspace, viewport: view } })); setPoint(kind, view.center); }}
            onBearing={(bearing) => camera.setAzimuth(Math.round(bearing))} />
          <p className="text-xs text-muted-foreground">© NASA Earth Observatory / MODIS · Blue Marble，2004 年 8 月。原始瓦片最高 8 级；放大不增加细节。<a href={NASA_SOURCE_URL} target="_blank" rel="noreferrer" className="text-primary">数据来源</a> · 地图瓦片由浏览器直接向 NASA 请求。</p>
        </div>
        {tab === 'preview' && <section className="rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold">同机位、同镜头的地形预演</h2>
          <CameraSimulator key={`${location.id}:${plan.coordinates}:${draft.vantage.cameraHeightM}`} locationId={location.id} coordinates={plan.coordinates} elevation={location.elevation} currentDate={currentDate} timeZone={plan.timeZone} cameraHeightM={draft.vantage.cameraHeightM ?? 1.6} />
          <p className="text-xs text-muted-foreground">几何预演使用同一机位、镜头和时间。只模拟地形与理论光位，不预测云海、植被或实际成片。尚无现场标定，精度未核验。</p>
          <button disabled={terrainBusy} className="workbench-button" onClick={() => void analyze()}>{terrainBusy ? '计算中…' : '分析地形与日月遮挡'}</button>
          {analysis && !activeAnalysis && <p className="text-amber-500 text-sm">机位、主体、方向或时间已改变，请重新分析。</p>}
          {activeAnalysis && <div className="space-y-2 text-sm rounded-xl bg-muted/40 p-4"><p className="font-semibold">{terrainLabels[activeAnalysis.status]}</p><p>{activeAnalysis.dataset} · {activeAnalysis.verticalDatum} · {activeAnalysis.dataVersion}</p><p>太阳：{visibility(activeAnalysis.sun?.visibility)} · 月亮：{visibility(activeAnalysis.moon?.visibility)}</p><p>主体：{visibility(activeAnalysis.subject ?? undefined)}</p>{activeAnalysis.resource && <a className="text-primary" href={activeAnalysis.resource.sourceUrl} target="_blank" rel="noreferrer">查看地形来源 · {activeAnalysis.resource.cardId}</a>}</div>}
        </section>}
        {tab === 'astronomy' && <section className="rounded-xl border border-border p-5 space-y-5">
          <h2 className="font-semibold">{draft.workspace.intent === 'astro' ? '星空拍摄窗口' : '光线与拍摄窗口'}</h2>
          <div className="grid md:grid-cols-2 gap-6"><SunPathDiagram sunMoonData={sun} timeOfDay={time.timeOfDay} coordinates={plan.coordinates} date={currentDate} timeZone={plan.timeZone} /><GoldenHourDisplay sunMoonData={sun} currentDate={currentDate} timeZone={plan.timeZone} /></div>
          <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-2"><p>当前月亮：方位 {sun.moonPosition.azimuth.toFixed(1)}° · 高度 {sun.moonPosition.altitude.toFixed(1)}°</p><p>月亮与镜头中心 ±1° 的理论对齐窗口：{windows.length ? windows.map((window) => `${formatTime(window.start, plan.timeZone)}–${formatTime(window.end, plan.timeZone)}`).join('、') : '所选日期没有符合条件的窗口'}</p><p className="text-xs text-muted-foreground">以上基于 SunCalc 2.0 的理论计算。尚未接入云量、能见度、光污染和银河中心；月亮低于地平线也不保证能拍到星空。</p></div>
        </section>}
        <section className="rounded-xl bg-card border border-border p-5 space-y-4"><label className="text-sm">拍摄日期（北京时间）<input type="date" className="workbench-input max-w-64" value={time.dateKey} onChange={(event) => { if (shootingPlanSchema.shape.dateKey.safeParse(event.target.value).success) time.setDateKey(event.target.value); }} /></label><TimeSlider timeOfDay={time.timeOfDay} onChange={time.setTimeOfDay} sunMoonData={sun} dateKey={time.dateKey} timeZone={plan.timeZone} /></section>
        <section className="rounded-xl border border-border p-5 space-y-3"><h2 className="font-semibold">本项目的依据与下一步</h2><div className="grid sm:grid-cols-3 gap-3 text-xs"><p>选区底图<br /><b>NASA Blue Marble</b><br />2004-08 · 全球概览影像</p><p>地形几何<br /><b>{location.id === 'niubei' ? '牛背山 GLO-30 试点' : '该地点尚未接入 DEM'}</b><br />覆盖与高程基准由分析前校验</p><p>日月能力<br /><b>SunCalc 2.0</b><br />理论位置，不含天气</p></div><div className="flex flex-wrap gap-3 text-sm"><Link className="text-primary" href={`/location/${location.id}#shooting-plan`}>高级计划 / 照片山脊校准</Link><Link className="text-primary" href="/knowledge">摄影知识与来源</Link><Link className="text-primary" href="/api/resources">资源 Card 目录</Link></div><p className="text-xs text-muted-foreground">AI 概念图、天气、实时频道与订阅将在后续阶段接入此项目；当前没有向第三方模型发送照片。</p></section>
      </section>
      <aside className="space-y-5 min-w-0">
        <section className="rounded-xl bg-card border border-border p-5 space-y-4"><h2 className="font-semibold">机位与主体</h2><p className="text-xs text-amber-500">{plan.coordinateSource === 'catalogue' ? '目录示意点' : '用户选点'} · WGS84 假定 · 待核验</p>
          <PointForm key={`v:${plan.coordinates}`} title="机位" coordinates={plan.coordinates} onApply={(coordinates) => setPoint('vantage', coordinates)} />
          <PointForm key={`s:${draft.subject?.coordinates}`} title="主体" coordinates={draft.subject?.coordinates ?? null} onApply={(coordinates) => setPoint('subject', coordinates)} />
          {draft.subject && <button className="workbench-button" onClick={() => { setDraft({ ...draft, subject: null }); setMapRevision((value) => value + 1); }}>清除主体</button>}
          <label className="block text-xs">相机离地高度（米）<input type="number" min={0} max={100} step={0.1} className="workbench-input" value={draft.vantage.cameraHeightM ?? ''} onChange={(event) => setDraft({ ...draft, vantage: { ...draft.vantage, cameraHeightM: event.target.value === '' ? null : Number(event.target.value) } })} /></label>
          <p className="text-xs text-muted-foreground">未填离地高度时预演按 1.6 米估算。选点不等于 GPS 测量；请在现场确认精度与通行条件。</p>
        </section>
        <section className="rounded-xl bg-card border border-border p-5"><CameraControls /></section>
        <label className="block rounded-xl bg-card border border-border p-5 text-sm">拍摄笔记<textarea className="workbench-input min-h-28" value={plan.notes} maxLength={2000} onChange={(event) => setDraft({ ...draft, plan: { ...draft.plan, notes: event.target.value } })} placeholder="希望拍到的画面、现场核验事项…" /></label>
      </aside>
    </div>
  </div>;
}
function PointForm({ title, coordinates, onApply }: { title: string; coordinates: [number, number] | null; onApply: (value: [number, number]) => void }) {
  return <form className="space-y-2" onSubmit={(event) => {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    const value = shootingPlanSchema.shape.coordinates.safeParse([Number(fields.get('lng')), Number(fields.get('lat'))]);
    if (value.success) onApply(value.data);
  }}><p className="text-xs font-medium">{title}{!coordinates && '（可选）'}</p><div className="grid grid-cols-2 gap-2"><label className="text-xs">经度<input aria-label={`${title}经度`} name="lng" type="number" min={-180} max={180} step="any" required defaultValue={coordinates?.[0] ?? ''} className="workbench-input" /></label><label className="text-xs">纬度<input aria-label={`${title}纬度`} name="lat" type="number" min={-85.051129} max={85.051129} step="any" required defaultValue={coordinates?.[1] ?? ''} className="workbench-input" /></label></div><button className="workbench-button" type="submit">应用{title}坐标</button></form>;
}
