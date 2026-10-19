'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import exifr from 'exifr';
import { PhotoUploader } from '@/components/upload/PhotoUploader';
import { ShootingParamsForm } from '@/components/upload/ShootingParamsForm';

function formatShutter(sec: number | undefined): string | undefined {
  if (!sec) return undefined;
  if (sec >= 1) return `${sec}s`;
  return `1/${Math.round(1 / sec)}s`;
}

interface ExifMetadata {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  FocalLength?: number;
  longitude?: number;
  latitude?: number;
  DateTimeOriginal?: string | Date;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
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
    azimuth: '',
    elevation: '',
    priceType: 'free' as 'free' | 'paid',
    price: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);

    // Auto-parse EXIF/GPS from the file. Best-effort: failures are silent.
    exifr.parse(selectedFile, {
      tiff: true,
      exif: true,
      gps: true,
    }).then((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const exif = raw as ExifMetadata;
      setParams((prev) => ({
        ...prev,
        cameraMake: exif.Make ?? prev.cameraMake,
        cameraModel: exif.Model ?? prev.cameraModel,
        lens: exif.LensModel ?? prev.lens,
        aperture: exif.FNumber ? `f/${exif.FNumber}` : prev.aperture,
        shutterSpeed: formatShutter(exif.ExposureTime) ?? prev.shutterSpeed,
        iso: exif.ISO ? String(exif.ISO) : prev.iso,
        focalLength: exif.FocalLength ? String(Math.round(exif.FocalLength)) : prev.focalLength,
        coordinatesLng: exif.longitude != null ? exif.longitude.toFixed(6) : prev.coordinatesLng,
        coordinatesLat: exif.latitude != null ? exif.latitude.toFixed(6) : prev.coordinatesLat,
        shotAt: exif.DateTimeOriginal
          ? new Date(exif.DateTimeOriginal).toISOString().slice(0, 16)
          : prev.shotAt,
      }));
    }).catch(() => {});
  }, []);

  const handleClear = () => {
    setFile(null);
    setPreview(null);
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
          azimuth: params.azimuth ? parseFloat(params.azimuth) : undefined,
          elevation: params.elevation ? parseFloat(params.elevation) : undefined,
          priceType: params.priceType,
          price: params.price ? parseFloat(params.price) : 0,
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
        </div>

        {/* Right: Parameters */}
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 scrollbar-thin">
          <ShootingParamsForm params={params} onChange={setParams} />
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
