'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Upload, Loader2, ArrowRight } from 'lucide-react';

interface Photo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  priceType: string;
  price: number;
  downloadCount: number;
  viewCount: number;
  status: string;
  createdAt: string;
}

export default function MyWorksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((p) => {
        if (p?.id) {
          setUserId(p.id);
          return fetch(`/api/photos?userId=${p.id}&limit=50`);
        }
        return null;
      })
      .then((r) => (r ? r.json() : { photos: [] }))
      .then((data) => {
        setPhotos(data.photos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-glow" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">MY WORKS</p>
          <h1 className="text-3xl font-bold font-heading">我的作品</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {photos.length > 0 ? `共 ${photos.length} 张作品；未获分发授权的作品仅自己可见` : '还没有上传过照片'}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-1 text-sm text-glow hover:text-glow/80 border border-glow/30 hover:border-glow/60 rounded-lg px-3 py-2 transition-colors"
        >
          <Upload className="w-4 h-4" /> 上传新照片
        </Link>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">上传你的第一张照片</p>
          <Link href="/upload" className="inline-flex items-center gap-1 text-glow hover:underline">
            前向上传 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => (
            <Link
              key={p.id}
              href={`/photo/${p.id}`}
              className="group bg-card border border-border/50 rounded-lg overflow-hidden hover:border-glow/40 transition-all card-lift"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium truncate group-hover:text-glow transition-colors">
                  {p.title}
                </h3>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-mono">
                  <span>{p.status === 'approved' ? (p.priceType === 'free' ? '免费' : `¥${p.price}`) : p.status}</span>
                  <span>▼ {p.viewCount} · ⬇ {p.downloadCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
