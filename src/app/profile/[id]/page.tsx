'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Camera, Image } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  isCreator?: boolean;
  bio: string | null;
  photoCount: number;
  createdAt: string;
}

interface Photo {
  id: string;
  title: string;
  thumbnailUrl: string;
  priceType: string;
  price: number;
}

export default function ProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${params.id}`).then((r) => r.json()),
      fetch(`/api/photos?userId=${params.id}&limit=30`).then((r) => r.json()),
    ])
      .then(([profileData, photosData]) => {
        setProfile(profileData?.id ? profileData : null);
        setPhotos(photosData.photos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <p className="text-white/50">用户不存在</p>
      </div>
    );
  }

  const roleLabel = profile.role === 'admin' ? '管理员'
    : profile.isCreator ? '摄影师' : '驴友';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-glow/20 border-2 border-glow/40 flex items-center justify-center text-2xl font-bold text-glow shrink-0">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-white/40">
            <span className="px-2 py-0.5 rounded bg-white/10 text-white/60">{roleLabel}</span>
            <span>{profile.photoCount} 作品</span>
            <span>加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          {profile.bio && (
            <p className="text-white/60 mt-3 max-w-xl">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Photos grid */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Image className="w-5 h-5 text-glow" />
        作品集
      </h2>

      {photos.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无作品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href={`/photo/${photo.id}`}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={photo.thumbnailUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                <p className="text-sm font-medium text-white truncate">{photo.title}</p>
                {photo.priceType === 'paid' && (
                  <span className="text-xs text-glow">¥{photo.price}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
