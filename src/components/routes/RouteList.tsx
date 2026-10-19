'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Clock, Mountain, Plus } from 'lucide-react';

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  days: number | null;
  bestSeason: string | null;
  difficulty: number;
  coverImage: string | null;
  viewCount: number;
  stopCount: number;
  authorName: string | null;
  authorIsCreator: boolean | null;
}

const seasonLabels: Record<string, string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
};

export function RouteList() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routes?limit=20')
      .then((r) => r.json())
      .then((data) => {
        setRoutes(data.routes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-glow" />
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="text-center py-20">
        <Mountain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-2">还没有线路</p>
        <Link
          href="/routes/new"
          className="inline-flex items-center gap-1 text-glow hover:underline"
        >
          <Plus className="w-4 h-4" /> 创建第一条
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold font-heading">度假线路 ({routes.length})</h2>
        <Link
          href="/routes/new"
          className="flex items-center gap-1 text-sm text-glow hover:text-glow/80"
        >
          <Plus className="w-4 h-4" /> 创建线路
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => {
          const cover = route.coverImage ||
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80';
          return (
            <Link
              key={route.id}
              href={`/routes/${route.id}`}
              className="group block bg-card border border-border/50 rounded-xl overflow-hidden hover:border-glow/40 transition-all card-lift"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt={route.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-glow/80">
                    {route.stopCount} STOPS
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {route.authorName || '匿名'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg group-hover:text-glow transition-colors line-clamp-1">
                  {route.title}
                </h3>
                {route.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {route.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {route.days && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {route.days}天
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mountain className="w-3 h-3" /> {'★'.repeat(route.difficulty)}
                  </span>
                  {route.bestSeason && (
                    <span className="flex items-center gap-1">
                      {route.bestSeason.split(',').map((s) => seasonLabels[s] || s).join('')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {route.viewCount} 浏览
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
