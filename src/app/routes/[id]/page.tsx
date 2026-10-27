'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, MapPin, Mountain, Compass, Truck, Home,
  Calendar, Loader2, ChevronRight, Sparkles,
} from 'lucide-react';
import { locations } from '@/data/locations';

interface RouteStop {
  id: string;
  orderIndex: number;
  locationId: string | null;
  photoId: string | null;
  note: string | null;
  transportHint: string | null;
  bestTimeOfDay: string | null;
  staySuggestion: string | null;
}

interface RouteDetail {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  days: number | null;
  bestSeason: string | null;
  difficulty: number;
  coverImage: string | null;
  status: string;
  viewCount: number;
  createdAt: string;
  authorName: string | null;
  authorAvatar: string | null;
  authorIsCreator: boolean | null;
}

const timeLabels: Record<string, string> = {
  dawn: '黎明', morning: '上午', noon: '正午', afternoon: '下午', dusk: '黄昏', night: '夜晚',
};

const seasonLabels: Record<string, string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
};

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/routes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.route) {
          setRoute(data.route);
          setStops(data.stops || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-glow" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">线路不存在或未发布</p>
        <Link href="/discover" className="mt-4 inline-flex text-glow hover:underline">
          返回发现
        </Link>
      </div>
    );
  }

  const cover = route.coverImage;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/discover?tab=routes" className="inline-flex items-center text-sm text-muted-foreground hover:text-glow mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回线路列表
      </Link>

      {/* Hero */}
      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden mb-8 border border-border/50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={route.title} className="w-full h-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-950" aria-label="线路尚无封面" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 text-xs text-glow mb-2 font-mono uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            <span>ROUTE · {stops.length} STOPS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">{route.title}</h1>
          {route.authorName && (
            <p className="text-sm text-muted-foreground mt-2">
              创建者 {route.authorName}
              {route.authorIsCreator && ' · 摄影师'}
            </p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetaCard icon={<Clock className="w-4 h-4" />} label="天数" value={route.days ? `${route.days} 天` : '—'} />
        <MetaCard icon={<Mountain className="w-4 h-4" />} label="难度" value={`${'★'.repeat(route.difficulty)}${'☆'.repeat(5 - route.difficulty)}`} />
        <MetaCard icon={<Calendar className="w-4 h-4" />} label="最佳季节" value={route.bestSeason ? route.bestSeason.split(',').map((s) => seasonLabels[s] || s).join('、') : '不限'} />
        <MetaCard icon={<Compass className="w-4 h-4" />} label="浏览" value={String(route.viewCount)} />
      </div>

      {/* Description */}
      {route.description && (
        <div className="bg-card border border-border/50 rounded-xl p-6 mb-8">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-mono">行程简介</h2>
          <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{route.description}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold font-heading mb-4">行程序列</h2>
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/50" />
          <div className="space-y-4">
            {stops.map((stop, idx) => {
              const loc = stop.locationId ? locations.find((l) => l.id === stop.locationId) : null;
              return (
                <div key={stop.id} className="relative pl-12">
                  {/* node */}
                  <div className="absolute left-2 top-3 w-8 h-8 rounded-full bg-card border border-glow/40 flex items-center justify-center text-xs font-mono text-glow">
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  <div className="bg-card border border-border/50 rounded-xl p-5 card-lift">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        {loc ? (
                          <>
                            <Link
                              href={`/location/${loc.id}`}
                              className="font-semibold text-lg hover:text-glow transition-colors flex items-center gap-2"
                            >
                              <MapPin className="w-4 h-4 text-glow" />
                              {loc.name}
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {loc.province} · 海拔 {loc.elevation}m
                            </p>
                          </>
                        ) : (
                          <span className="font-medium">未绑定拍摄点</span>
                        )}
                      </div>
                      {stop.bestTimeOfDay && (
                        <span className="text-xs px-2 py-1 rounded-full bg-glow/10 text-glow border border-glow/30 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {timeLabels[stop.bestTimeOfDay] || stop.bestTimeOfDay}
                        </span>
                      )}
                    </div>

                    {stop.note && (
                      <p className="text-sm text-foreground/80 mt-2">{stop.note}</p>
                    )}

                    {(stop.transportHint || stop.staySuggestion) && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {stop.transportHint && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {stop.transportHint}
                          </span>
                        )}
                        {stop.staySuggestion && (
                          <span className="flex items-center gap-1">
                            <Home className="w-3 h-3" /> {stop.staySuggestion}
                          </span>
                        )}
                      </div>
                    )}

                    {loc && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {loc.sceneryTags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
        <button
          onClick={() => router.push('/routes/new')}
          className="px-5 py-2.5 bg-glow text-black rounded-lg font-medium hover:bg-glow/90 transition-colors"
        >
          创建我的线路
        </button>
        <Link
          href="/discover?tab=routes"
          className="px-5 py-2.5 border border-border/50 rounded-lg text-center text-foreground hover:border-glow/40 transition-colors"
        >
          浏览更多线路
        </Link>
      </div>
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-medium font-mono">{value}</div>
    </div>
  );
}
