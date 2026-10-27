'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle } from 'lucide-react';
import { PhotoUploader } from '@/components/upload/PhotoUploader';
import { ShootingParamsForm } from '@/components/upload/ShootingParamsForm';
import type { PhotoEvidence } from '@/lib/photo-evidence';
import { noDistribution, type DistributionScope } from '@/lib/license';

interface AnalysisResponse {
  evidence: PhotoEvidence;
  width: number;
  height: number;
  guidance: string[];
  analysisType: 'exif_only';
  visualGeolocation: 'not_run';
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [attestOwnership, setAttestOwnership] = useState(false);
  const [licenseScope, setLicenseScope] = useState<DistributionScope>(noDistribution);
  const requestId = useRef(0);
  const [params, setParams] = useState({
    title: '',
    description: '',
    locationId: '',
    coordinatesLng: '',
    coordinatesLat: '',
    shotAt: '',
    weather: '',
    cameraMake: '',
    cameraModel: '',
    lens: '',
    aperture: '',
    shutterSpeed: '',
    iso: '',
    focalLength: '',
    sensorFormat: 'unknown' as 'unknown' | 'fullFrame' | 'apsc' | 'm43',
    azimuth: '',
    elevation: '',
    shareCoordinates: false,
    priceType: 'free' as 'free' | 'paid',
    price: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const currentRequest = ++requestId.current;
    setFile(selectedFile);
    setAttestOwnership(false); setLicenseScope(noDistribution);
    setError(''); setAnalysis(null); setAnalyzing(true);
    // Evidence and consent belong to one photo. Replacing it must not carry
    // coordinates or a prior sharing choice into the next submission.
    setParams((current) => ({ ...current, locationId: '', coordinatesLng: '', coordinatesLat: '',
      shotAt: '', weather: '', cameraMake: '', cameraModel: '', lens: '', aperture: '',
      shutterSpeed: '', iso: '', focalLength: '', sensorFormat: 'unknown',
      azimuth: '', elevation: '', shareCoordinates: false }));
    const reader = new FileReader();
    reader.onload = (e) => { if (currentRequest === requestId.current) setPreview(e.target?.result as string); };
    reader.readAsDataURL(selectedFile);
    try {
      const form = new FormData(); form.append('file', selectedFile);
      const response = await fetch('/api/photos/analyze', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '照片分析失败');
      if (currentRequest === requestId.current) setAnalysis(data as AnalysisResponse);
    } catch (error) { if (currentRequest === requestId.current) setError(error instanceof Error ? error.message : '照片分析失败'); }
    finally { if (currentRequest === requestId.current) setAnalyzing(false); }
  }, []);

  function applyEvidence() {
    if (!analysis) return;
    const e = analysis.evidence;
    setParams((current) => ({ ...current,
      coordinatesLng: current.coordinatesLng || (e.coordinates ? e.coordinates[0].toFixed(6) : ''),
      coordinatesLat: current.coordinatesLat || (e.coordinates ? e.coordinates[1].toFixed(6) : ''),
      shotAt: current.shotAt || e.shotAtLocal || '',
      cameraMake: current.cameraMake || e.cameraMake || '',
      cameraModel: current.cameraModel || e.cameraModel || '',
      lens: current.lens || e.lens || '',
      aperture: current.aperture || e.aperture || '',
      shutterSpeed: current.shutterSpeed || e.shutterSpeed || '',
      iso: current.iso || (e.iso === null ? '' : String(e.iso)),
      focalLength: current.focalLength || (e.focalLengthMm === null ? '' : String(Math.round(e.focalLengthMm))),
      sensorFormat: current.sensorFormat === 'unknown' ? e.sensorSuggestion || 'unknown' : current.sensorFormat,
      azimuth: current.azimuth || (e.azimuthDeg === null ? '' : String(e.azimuthDeg)),
    }));
  }

  const handleClear = () => {
    requestId.current++;
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setAttestOwnership(false); setLicenseScope(noDistribution);
    setAnalyzing(false);
    setParams((current) => ({ ...current, locationId: '', coordinatesLng: '', coordinatesLat: '',
      shotAt: '', weather: '', cameraMake: '', cameraModel: '', lens: '', aperture: '',
      shutterSpeed: '', iso: '', focalLength: '', sensorFormat: 'unknown',
      azimuth: '', elevation: '', shareCoordinates: false }));
  };

  async function handleSubmit() {
    if (!file) {
      setError('请先选择图片');
      return;
    }
    if (!params.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!attestOwnership || !licenseScope.web) {
      setError('请确认作品权利，并选择允许网页展示后再提交审核');
      return;
    }
    if (params.priceType === 'paid' && !licenseScope.paid) {
      setError('收费作品需明确选择允许收费展示');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'metadata',
        JSON.stringify({
          title: params.title,
          description: params.description || undefined,
          locationId: params.locationId || undefined,
          coordinatesLng: params.coordinatesLng ? parseFloat(params.coordinatesLng) : undefined,
          coordinatesLat: params.coordinatesLat ? parseFloat(params.coordinatesLat) : undefined,
          shotAt: params.shotAt || undefined,
          weather: params.weather || undefined,
          cameraMake: params.cameraMake || undefined,
          cameraModel: params.cameraModel || undefined,
          lens: params.lens || undefined,
          aperture: params.aperture || undefined,
          shutterSpeed: params.shutterSpeed || undefined,
          iso: params.iso ? parseInt(params.iso) : undefined,
          focalLength: params.focalLength ? parseInt(params.focalLength) : undefined,
          sensorFormat: params.sensorFormat,
          azimuth: params.azimuth ? parseFloat(params.azimuth) : undefined,
          elevation: params.elevation ? parseFloat(params.elevation) : undefined,
          shareCoordinates: params.shareCoordinates,
          priceType: params.priceType,
          price: params.price ? parseFloat(params.price) : 0,
          attestOwnership,
          distributionScope: licenseScope,
        })
      );

      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '上传失败');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/profile'), 2000);
    } catch {
      setError('上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">上传成功！</h2>
          <p className="text-white/50">作品已进入审核队列，管理员审核通过后将公开显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">上传作品</h1>
      <p className="text-white/50 mb-8">分享你的摄影作品，帮助更多摄影爱好者发现这个机位</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Image upload */}
        <div className="space-y-6">
          <PhotoUploader
            onFileSelect={handleFileSelect}
            preview={preview}
            onClear={handleClear}
          />
          {analyzing && <p className="text-sm text-white/50">正在读取照片元数据…</p>}
          {analysis && <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
            <h2 className="font-medium">照片证据与拍摄建议</h2>
            <p className="text-white/60">已读取 EXIF，尚未运行画面视觉定位。{analysis.width} × {analysis.height} 像素；解析结果仅作为待确认建议。</p>
            <p>GPS：{analysis.evidence.coordinates ? analysis.evidence.coordinates.join(', ') : '无'}；朝向：{analysis.evidence.azimuthDeg === null ? '未知' : `${analysis.evidence.azimuthDeg}°`}；焦距：{analysis.evidence.focalLengthMm === null ? '未知' : `${analysis.evidence.focalLengthMm}mm`}。</p>
            {analysis.evidence.warnings.map((item, index) => <p className="text-amber-300" key={index}>{item}</p>)}
            {analysis.guidance.map((item, index) => <p className="text-white/70" key={index}>{item}</p>)}
            <button className="text-glow underline" onClick={applyEvidence}>将建议填入空白表单项</button>
          </div>}
        </div>

        {/* Right: Parameters */}
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 scrollbar-thin">
          <ShootingParamsForm params={params} onChange={setParams} />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 text-sm">
        <h2 className="font-medium">作品授权范围</h2>
        <p className="text-white/60">授权申请会与作品一起送审；审核通过前不会据此公开原图或提供付费交付。电视、相框与再加工均需单独选择。</p>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={attestOwnership} onChange={(event) => setAttestOwnership(event.target.checked)} />我确认拥有此作品的相应权利，并同意提交以下使用范围供平台审核。</label>
        <div className="grid grid-cols-2 gap-2 text-white/80">
          {([
            ['web', '网页展示'], ['mobile', '手机端展示'], ['tv', '电视端展示'],
            ['frame', '数字相框展示'], ['paid', '允许收费展示'], ['download', '允许购买后下载'],
            ['derivative', '允许平台再加工'],
          ] as const).map(([key, label]) => <label className="flex gap-2 items-center" key={key}>
            <input type="checkbox" checked={licenseScope[key]} onChange={(event) => setLicenseScope((current) => ({ ...current, [key]: event.target.checked }))} />{label}
          </label>)}
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={uploading || !file}
          className="px-6 py-2.5 rounded-lg bg-glow text-black font-medium hover:bg-glow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading ? '上传中...' : '提交作品'}
        </button>
      </div>
    </div>
  );
}
