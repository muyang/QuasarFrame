'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, Sparkles, Radio, ArrowRight, Image as ImageIcon, Route as RouteIcon } from 'lucide-react';
import { locations } from '@/data/locations';
import { sceneryTypes, sceneryList } from '@/data/scenery-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RouteList } from '@/components/routes/RouteList';
import { VerifiedPhoto } from '@/components/shared/VerifiedPhoto';
import type { SceneryType } from '@/types/location';

type Tab = 'photos' | 'routes';

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-8 px-4" role="status">正在加载拍摄地与线路…</div>}>
      <DiscoverContent />
    </Suspense>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab: Tab = (searchParams.get('tab') as Tab) === 'routes' ? 'routes' : 'photos';
  const [selectedTags, setSelectedTags] = useState<SceneryType[]>([]);
  const featured = locations;

  function switchTab(next: Tab) {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === 'routes') sp.set('tab', 'routes');
    else sp.delete('tab');
    router.replace(`/discover${sp.toString() ? `?${sp.toString()}` : ''}`);
  }

  const filteredLocations = useMemo(() => {
    if (selectedTags.length === 0) return locations;
    return locations.filter((loc) =>
      selectedTags.some((tag) => loc.sceneryTags.includes(tag))
    );
  }, [selectedTags]);

  const toggleTag = (tag: SceneryType) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-heading">智能发现</h1>
          <p className="text-muted-foreground mt-2">按景色类型筛选拍摄地、浏览度假线路、查看实时风景</p>
        </div>

        <p className="text-xs text-muted-foreground mb-4">展示图片已逐张核对地点说明与开放许可；地点坐标、海拔和推荐时段仍属待现场核验的目录资料。</p>
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-border/50">
          <TabButton
            active={tab === 'photos'}
            onClick={() => switchTab('photos')}
            icon={<ImageIcon className="w-4 h-4" />}
            label="拍摄地"
          />
          <TabButton
            active={tab === 'routes'}
            onClick={() => switchTab('routes')}
            icon={<RouteIcon className="w-4 h-4" />}
            label="度假线路"
          />
        </div>

        {/* Live feeds banner */}
        <Link
          href="/feeds/live"
          className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 transition-all p-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-red-500 font-semibold">LIVE</span>
                <span className="text-base font-semibold">实时风景摄像头</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">查看来自全国风景区的高清直播画面</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>

        {tab === 'routes' ? (
          <RouteList />
        ) : (
          <>
        {/* Scenery Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedTags([])}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
              selectedTags.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            全部
          </button>
          {sceneryList.map((info) => (
            <button
              key={info.type}
              onClick={() => toggleTag(info.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                selectedTags.includes(info.type)
                  ? 'text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              style={
                selectedTags.includes(info.type)
                  ? { backgroundColor: info.color }
                  : undefined
              }
            >
              {info.icon} {info.label}
            </button>
          ))}
        </div>

        {/* Editorial examples, not a live shooting forecast. */}
        {selectedTags.length === 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-golden" />
              <h2 className="text-xl font-semibold">风光拍摄样例</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featured.slice(0, 3).map((loc, i) => {
                return (
                  <Link key={loc.id} href={`/location/${loc.id}`}>
                    <Card className="group border-golden/20 hover:border-golden/40 transition-all">
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <VerifiedPhoto photo={loc.photos[0]} alt={`${loc.name}：${loc.photos[0]?.caption ?? '地点照片待核验'}`} />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-golden/90 text-golden-foreground text-xs">
                            样例 #{i + 1}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {loc.sceneryTags.map((tag) => sceneryTypes[tag]?.label).join(' · ')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Location Grid */}
        <h2 className="text-xl font-semibold mb-4">
          {selectedTags.length > 0 ? `筛选结果 (${filteredLocations.length})` : '所有拍摄地'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((loc) => {
            return (
              <Link key={loc.id} href={`/location/${loc.id}`}>
                <Card className="group overflow-hidden border-border/30 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
                  <div className="aspect-[3/2] overflow-hidden relative">
                      <VerifiedPhoto photo={loc.photos[0]} alt={`${loc.name}：${loc.photos[0]?.caption ?? '地点照片待核验'}`} />

                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground">{loc.nameEn} · {loc.province}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {loc.sceneryTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-2 py-0"
                          style={{
                            borderColor: sceneryTypes[tag]?.color + '40',
                            color: sceneryTypes[tag]?.color,
                          }}
                        >
                          {sceneryTypes[tag]?.icon} {sceneryTypes[tag]?.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {loc.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
        active
          ? 'border-glow text-glow'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
