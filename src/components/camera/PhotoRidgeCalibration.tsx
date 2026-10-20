'use client';

import { useEffect, useState } from 'react';
import type { ShootingPlan } from '@/lib/shooting-plan';
import type { SensorPreset } from '@/lib/camera-optics';

interface Props {
  locationId: string;
  initialPhotoUrl?: string | null;
  readPlan: () => ShootingPlan;
  focalLengthMm: number;
  sensor: SensorPreset;
  portrait: boolean;
  onApplyTilt: (tilt: number) => void;
}

interface CalibrationResponse {
  status: 'theoretical' | 'aspect_mismatch' | 'insufficient_data' | 'outside_coverage' | 'illustrative_coordinate_mismatch';
  suggestedTiltDeg?: number;
  ridgeAngleDeg?: number;
  ridgeDistanceM?: number;
  dataVersion: string;
}

interface MatchResponse {
  status: 'candidates' | 'insufficient_data' | 'aspect_mismatch';
  candidates: Array<{ coordinates: [number, number]; rmsDeg: number; tiltDeg: number; rollSlopeDeg: number }>;
  minimumUncertaintyRadiusM?: number;
  dataVersion: string;
  note?: string;
}

export function PhotoRidgeCalibration({ locationId, initialPhotoUrl, readPlan, focalLengthMm, sensor, portrait, onApplyTilt }: Props) {
  const [url, setUrl] = useState<string | null>(initialPhotoUrl ?? null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'calibrate' | 'candidates'>('calibrate');
  const [markers, setMarkers] = useState<Array<{ x: number; y: number }>>([]);
  const [radiusM, setRadiusM] = useState('1000');
  const [result, setResult] = useState<CalibrationResponse | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); }, [url]);

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setMessage('请选择 20MB 以内的 JPG、PNG 或 WebP 照片');
      return;
    }
    setUrl(URL.createObjectURL(file));
    setAspect(null); setMarker(null); setMarkers([]); setResult(null); setMatchResult(null); setMessage('');
  }

  async function searchCandidates() {
    if (!aspect || markers.length < 5) return;
    setBusy(true); setMatchResult(null);
    try {
      const plan = readPlan();
      if (plan.coordinateSource === 'catalogue') throw new Error('请先输入大致搜索区域中心的 WGS84 坐标；目录示意点不能作为机位中心');
      const response = await fetch(`/api/terrain/${encodeURIComponent(locationId)}/skyline-match`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchCenter: plan.coordinates, radiusM: Number(radiusM),
          azimuthDeg: plan.azimuth, focalLengthMm, sensor, portrait, imageAspect: aspect,
          markers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '候选搜索失败');
      setMatchResult(body as MatchResponse);
      setMessage(body.status === 'candidates' ? '仅是限定区域内的相对排序，仍需照片地物或现场 GPS 核验'
        : body.status === 'aspect_mismatch' ? '照片宽高比与镜头设置不符' : '区域内没有足够的有效地形视线');
    } catch (error) { setMessage(error instanceof Error ? error.message : '候选搜索失败'); }
    finally { setBusy(false); }
  }

  async function analyze() {
    if (!marker || !aspect) return;
    setBusy(true); setResult(null);
    try {
      const plan = readPlan();
      const response = await fetch(`/api/terrain/${encodeURIComponent(locationId)}/calibrate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: plan.coordinates, coordinateSource: plan.coordinateSource,
          azimuthDeg: plan.azimuth, focalLengthMm, sensor, portrait,
          imageAspect: aspect, markerX: marker.x, markerY: marker.y }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '校准失败');
      setResult(body as CalibrationResponse);
      setMessage(body.status === 'theoretical' ? '已生成低可信度仰角建议；请与更多照片或现场视角核对'
        : body.status === 'illustrative_coordinate_mismatch' ? '目录坐标与真实高程不符，请填写实测机位'
          : body.status === 'aspect_mismatch' ? '照片宽高比与所选传感器或横竖拍设置不符'
            : '地形覆盖不足，无法校准');
    } catch (error) { setMessage(error instanceof Error ? error.message : '校准失败'); }
    finally { setBusy(false); }
  }

  return <div className="border-t border-border pt-4 space-y-3 text-xs">
    <h4 className="text-sm font-medium">照片与山脊地形对照</h4>
    <p className="text-muted-foreground">选择自己有权使用的原始照片，标记距机位 2 公里以上的山脊。使用当前机位、方位、实际焦距和传感器尺寸与 DEM 对照；照片只在浏览器预览，不会通过此步骤上传。</p>
    <div className="flex gap-3"><button className={mode === 'calibrate' ? 'font-semibold underline' : ''} onClick={() => setMode('calibrate')}>校准仰角</button>
      <button className={mode === 'candidates' ? 'font-semibold underline' : ''} onClick={() => setMode('candidates')}>寻找候选机位</button></div>
    <p className="text-muted-foreground">{mode === 'calibrate' ? '在画面中央 10% 宽度内点击一处远山脊。' : '沿照片可见的远山脊标记 5–12 点，横跨至少半幅照片；先输入大致搜索区域中心坐标。'}</p>
    <input aria-label="校准照片" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
    {url && <div className="relative max-w-xl">
      <img src={url} alt="待校准照片" className="w-full h-auto cursor-crosshair rounded" onLoad={(event) => setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
        onError={() => setMessage('无法读取作品图片，请确认浏览权限或重新选择本地照片')}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          if (mode === 'calibrate') {
            if (x < 0.45 || x > 0.55) { setMessage('请点击画面中央 10% 宽度内的远处山脊'); return; }
            setMarker({ x, y }); setResult(null);
          } else {
            if (markers.length >= 12) { setMessage('最多标记 12 个点；可先清空重选'); return; }
            setMarkers((current) => [...current, { x, y }]); setMatchResult(null);
          }
          setMessage('已标记山脊；调整机位与镜头参数后点击分析');
        }} />
      {mode === 'calibrate' && <div className="absolute inset-y-0 left-[45%] w-[10%] border-x border-dashed border-white/60 pointer-events-none" />}
      {mode === 'calibrate' && marker && <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 pointer-events-none"
        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }} />}
      {mode === 'candidates' && markers.map((point, index) => <span key={index} className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-500 text-[9px] text-white text-center pointer-events-none"
        style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}>{index + 1}</span>)}
    </div>}
    {mode === 'calibrate' ? <>
      <button className="rounded-lg border border-border px-3 py-2 hover:bg-muted disabled:opacity-50" disabled={!marker || !aspect || busy} onClick={analyze}>{busy ? '正在对照…' : '与真实地形对照'}</button>
      {result?.status === 'theoretical' && result.suggestedTiltDeg !== undefined && <p>2 公里外山脊理论仰角 {result.ridgeAngleDeg?.toFixed(2)}°（约 {Math.round(result.ridgeDistanceM ?? 0)} 米）；建议镜头仰角 {result.suggestedTiltDeg.toFixed(2)}°。数据版本 {result.dataVersion}。<button className="ml-2 underline disabled:opacity-50" disabled={result.suggestedTiltDeg < -10 || result.suggestedTiltDeg > 80} onClick={() => onApplyTilt(result.suggestedTiltDeg!)}>应用到当前计划</button></p>}
    </> : <>
      <div className="flex items-end gap-3"><label>搜索半径（米）<input type="number" min={100} max={2000} step={100} value={radiusM} onChange={(event) => setRadiusM(event.target.value)} className="block w-28 rounded border border-border bg-card p-2 mt-1" /></label>
        <button className="underline" disabled={!markers.length} onClick={() => { setMarkers([]); setMatchResult(null); }}>清空标记</button></div>
      <button className="rounded-lg border border-border px-3 py-2 hover:bg-muted disabled:opacity-50" disabled={markers.length < 5 || !aspect || busy} onClick={searchCandidates}>{busy ? '正在比较…' : `比较 ${markers.length} 个山脊点`}</button>
      {matchResult?.status === 'candidates' && <div className="space-y-1">
        <p>候选坐标的最小网格不确定半径约 {Math.round(matchResult.minimumUncertaintyRadiusM ?? 0)} 米；实际误差可能更大。版本 {matchResult.dataVersion}。</p>
        {matchResult.candidates.map((candidate, index) => <p key={index}>#{index + 1} {candidate.coordinates[0].toFixed(6)}, {candidate.coordinates[1].toFixed(6)} · 山脊拟合均方根 {candidate.rmsDeg.toFixed(2)}° · 仰角 {candidate.tiltDeg.toFixed(2)}°</p>)}
      </div>}
    </>}
    <p role="status" className="text-muted-foreground">{message}</p>
  </div>;
}
