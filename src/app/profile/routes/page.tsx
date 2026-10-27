'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Plus, Mountain, Clock, Eye } from 'lucide-react';

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  days: number | null;
  difficulty: number;
  coverImage: string | null;
  status: string;
  viewCount: number;
  stopCount: number;
  createdAt: string;
}

const seasonLabels: Record<string, string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
};

export default function MyRoutesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/routes?mine=1&limit=50')
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data.routes || []);
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

  const publishedCount = routes.filter((r) => r.status === 'published').length;
  const draftCount = routes.length - publishedCount;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">MY ROUTES</p>
          <h1 className="text-3xl font-bold font-heading">我的线路</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {routes.length > 0
              ? `共 ${routes.length} 条 · ${publishedCount} 已发布 · ${draftCount} 草稿`
              : '还没有创建过线路'}
          </p>
        </div>
        <Link
          href="/routes/new"
          className="flex items-center gap-1 text-sm text-glow hover:text-glow/80 border border-glow/30 hover:border-glow/60 rounded-lg px-3 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> 创建线路
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <Mountain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">创建你的第一条度假拍摄线路</p>
          <Link href="/routes/new" className="inline-flex items-center gap-1 text-glow hover:underline">
            前向创建 <Plus className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((r) => {
            const cover = r.coverImage;
            return (
              <Link
                key={r.id}
                href={`/routes/${r.id}`}
                className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:border-glow/40 transition-all card-lift"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-950" aria-label="线路尚无封面" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${
                        r.status === 'published'
                          ? 'bg-glow/20 text-glow border border-glow/40'
                          : 'bg-muted text-muted-foreground border border-border/50'
                      }`}
                    >
                      {r.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-glow/80">
                      {r.stopCount} STOPS
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg group-hover:text-glow transition-colors line-clamp-1">
                    {r.title}
                  </h3>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {r.days && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.days}天
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3" /> {'★'.repeat(r.difficulty)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {r.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
