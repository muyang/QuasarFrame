'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Camera, MapPin, Clock, Cloud, Aperture, Timer,
  Gauge, Focus, Compass, ArrowUp, Download, Lock,
  Eye, Heart, ArrowLeft, CheckCircle, Globe
} from 'lucide-react';
import { ShootingPositionIndicator } from '@/components/photos/ShootingPositionIndicator';

interface PhotoDetail {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  locationId: string | null;
  coordinatesLng: number | null;
  coordinatesLat: number | null;
  shotAt: string | null;
  weather: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLength: number | null;
  azimuth: number | null;
  elevation: number | null;
  priceType: 'free' | 'paid';
  price: number;
  downloadCount: number;
  viewCount: number;
  status: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    isCreator: boolean | null;
  };
  isUnlocked: boolean;
  isOwner: boolean;
}

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    fetch(`/api/photos/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPhoto(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function handleUnlock() {
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch(`/api/photos/${params.id}/unlock`, { method: 'POST' });
      if (res.ok) {
        // Reload photo data
        const data = await fetch(`/api/photos/${params.id}`).then((r) => r.json());
        setPhoto(data);
      } else {
        const err = await res.json();
        alert(err.error || '解锁失败');
      }
    } catch {
      alert('操作失败');
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <p className="text-white/50">作品不存在或已被删除</p>
      </div>
    );
  }

  const needsUnlock = photo.priceType === 'paid' && !photo.isUnlocked && !photo.isOwner;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="javascript:history.back()"
        className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main image */}
        <div className="lg:col-span-2">
          <div className="relative rounded-xl overflow-hidden bg-black/50 border border-white/10">
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className={`w-full ${needsUnlock ? 'blur-lg scale-105' : ''} transition-all`}
            />
            {needsUnlock && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <Lock className="w-12 h-12 text-white/60 mb-4" />
                <p className="text-white/80 mb-1">付费内容</p>
                <p className="text-white/50 text-sm mb-4">解锁查看原图和完整拍摄参数</p>
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="px-6 py-2.5 bg-glow text-black font-medium rounded-lg hover:bg-glow/90 transition-colors disabled:opacity-50"
                >
                  {unlocking ? '处理中...' : `解锁 ¥${photo.price}`}
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          {photo.description && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white/70 text-sm leading-relaxed">{photo.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          {/* Title & Author */}
          <div>
            <h1 className="text-xl font-bold text-white mb-3">{photo.title}</h1>
            <Link
              href={`/profile/${photo.author.id}`}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-glow/20 border border-glow/40 flex items-center justify-center text-sm font-medium text-glow">
                {photo.author.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white group-hover:text-glow transition-colors">
                  {photo.author.name}
                </div>
                <div className="text-xs text-white/40">
                  {photo.author.isCreator ? '摄影师' : '驴友'}
                </div>
              </div>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{photo.viewCount}</span>
            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{photo.downloadCount}</span>
            <span>{new Date(photo.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>

          {/* Shooting params (only if unlocked) */}
          {photo.isUnlocked && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-white/80 pb-2 border-b border-white/10">
                拍摄参数
              </h3>

              {photo.cameraMake && (
                <ParamRow icon={<Camera className="w-4 h-4" />} label="相机" value={`${photo.cameraMake} ${photo.cameraModel || ''}`} />
              )}
              {photo.lens && (
                <ParamRow icon={<Focus className="w-4 h-4" />} label="镜头" value={photo.lens} />
              )}
              {photo.aperture && (
                <ParamRow icon={<Aperture className="w-4 h-4" />} label="光圈" value={photo.aperture} />
              )}
              {photo.shutterSpeed && (
                <ParamRow icon={<Timer className="w-4 h-4" />} label="快门" value={photo.shutterSpeed} />
              )}
              {photo.iso && (
                <ParamRow icon={<Gauge className="w-4 h-4" />} label="ISO" value={String(photo.iso)} />
              )}
              {photo.focalLength && (
                <ParamRow icon={<Focus className="w-4 h-4" />} label="焦距" value={`${photo.focalLength}mm`} />
              )}

              {(photo.coordinatesLng || photo.azimuth !== null) && (
                <div className="pt-2 border-t border-white/10">
                  <h4 className="text-xs text-white/50 mb-2">位置与方向</h4>
                  {photo.coordinatesLng && (
                    <ParamRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="坐标"
                      value={`${photo.coordinatesLat?.toFixed(4)}, ${photo.coordinatesLng.toFixed(4)}`}
                    />
                  )}
                  {photo.azimuth !== null && (
                    <ParamRow icon={<Compass className="w-4 h-4" />} label="方位角" value={`${photo.azimuth}°`} />
                  )}
                  {photo.elevation !== null && (
                    <ParamRow icon={<ArrowUp className="w-4 h-4" />} label="仰角" value={`${photo.elevation}°`} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 机位复现 card — visual indicator for replicating the shot */}
          {photo.isUnlocked && (photo.azimuth !== null || photo.elevation !== null || photo.focalLength !== null) && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/80">机位复现</h3>
                <Link
                  href={photo.locationId
                    ? `/scout?location=${photo.locationId}&azimuth=${photo.azimuth ?? ''}&elevation=${photo.elevation ?? ''}&focalLength=${photo.focalLength ?? ''}`
                    : `/scout?azimuth=${photo.azimuth ?? ''}&elevation=${photo.elevation ?? ''}&focalLength=${photo.focalLength ?? ''}`}
                  className="text-xs text-glow hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" /> 在选景里打开
                </Link>
              </div>
              <ShootingPositionIndicator
                azimuth={photo.azimuth}
                elevation={photo.elevation}
                focalLength={photo.focalLength}
              />
              {photo.coordinatesLng && (
                <p className="text-xs text-white/40 mt-3 font-mono">
                  {photo.coordinatesLat?.toFixed(5)}, {photo.coordinatesLng.toFixed(5)}
                </p>
              )}
            </div>
          )}

          {/* Time & Weather */}
          {(photo.shotAt || photo.weather) && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              {photo.shotAt && (
                <ParamRow
                  icon={<Clock className="w-4 h-4" />}
                  label="拍摄时间"
                  value={new Date(photo.shotAt).toLocaleString('zh-CN')}
                />
              )}
              {photo.weather && (
                <ParamRow icon={<Cloud className="w-4 h-4" />} label="天气" value={photo.weather} />
              )}
            </div>
          )}

          {/* Location link */}
          {photo.locationId && (
            <Link
              href={`/location/${photo.locationId}`}
              className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors"
            >
              <MapPin className="w-4 h-4 text-glow" />
              <span className="text-sm text-white/70">查看景点详情</span>
            </Link>
          )}

          {/* Unlocked indicator */}
          {photo.isUnlocked && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              已解锁 — 可查看完整参数和下载原图
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParamRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-white/40">{icon}</span>
      <span className="text-white/50 w-16 shrink-0">{label}</span>
      <span className="text-white/80 truncate">{value}</span>
    </div>
  );
}
