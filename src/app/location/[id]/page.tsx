'use client';

import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Mountain, MapPin, Compass, Star } from 'lucide-react';
import Link from 'next/link';
import { getLocationById } from '@/data/locations';
import { sceneryTypes } from '@/data/scenery-types';
import { useTimeStore } from '@/stores/useTimeStore';
import { useSunCalc } from '@/hooks/useSunCalc';
import { Badge } from '@/components/ui/badge';
import { CameraSimulator } from '@/components/camera/CameraSimulator';
import { CameraControls } from '@/components/camera/CameraControls';
import { ShootingPlanner } from '@/components/camera/ShootingPlanner';
import { TimeSlider } from '@/components/astronomy/TimeSlider';
import { SunPathDiagram } from '@/components/astronomy/SunPathDiagram';
import { GoldenHourDisplay } from '@/components/astronomy/GoldenHourDisplay';
import { PhotoGrid } from '@/components/shared/PhotoGrid';
import { VerifiedPhoto } from '@/components/shared/VerifiedPhoto';
import { locationDateTime } from '@/lib/location-time';
import { getLocationProvenance } from '@/data/location-provenance';

const difficultyLabels = ['', '轻松', '简单', '中等', '较难', '专业'];
const difficultyStars = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const seasonLabels: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export default function LocationDetailPage() {
  const params = useParams();
  const location = getLocationById(params.id as string);
  const [previewVantage, setPreviewVantage] = useState<{ locationId: string; coordinates: [number, number] | null } | null>(null);
  const onVantageChange = useCallback((locationId: string, coordinates: [number, number] | null) => {
    setPreviewVantage({ locationId, coordinates });
  }, []);
  const effectiveCoordinates: [number, number] = previewVantage && previewVantage.locationId === location?.id && previewVantage.coordinates
    ? previewVantage.coordinates : location?.coordinates || [105, 35];

  const { timeOfDay, setTimeOfDay, dateKey, setDateKey } = useTimeStore();
  const provenance = getLocationProvenance();
  const timeZone = provenance.timeZone;
  const selectedDate = useMemo(() => locationDateTime(dateKey, timeOfDay * 60, timeZone), [dateKey, timeOfDay, timeZone]);
  const sunMoonData = useSunCalc(effectiveCoordinates, selectedDate, timeZone);

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-muted-foreground">点位未找到</p>
          <Link href="/scout" className="text-primary mt-4 inline-block">
            ← 返回选景
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <div className="relative h-[40vh] overflow-hidden">
        <VerifiedPhoto photo={location.photos[0]} alt={`${location.name}：${location.photos[0]?.caption ?? '地点照片待核验'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        {/* Back button */}
        <Link
          href="/scout"
          className="absolute top-6 left-6 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        {/* Title overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                {location.name}
              </h1>
              <p className="text-lg text-white/80 mt-1">{location.nameEn}</p>
            </div>
            <Badge variant="secondary" className="text-sm bg-white/20 text-white backdrop-blur-sm">
              {location.province}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Mountain className="w-3.5 h-3.5" />
              目录海拔（待核验）
            </div>
            <p className="font-semibold text-lg">{location.elevation}m</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Compass className="w-3.5 h-3.5" />
              难度（参考）
            </div>
            <p className="font-semibold text-lg">
              {difficultyLabels[location.difficulty]}{' '}
              <span className="text-golden text-sm">{difficultyStars[location.difficulty]}</span>
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MapPin className="w-3.5 h-3.5" />
              目录坐标（示意）
            </div>
            <p className="font-mono text-sm">
              {location.coordinates[1].toFixed(2)}°N, {location.coordinates[0].toFixed(2)}°E
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Star className="w-3.5 h-3.5" />
              建议季节（待核验）
            </div>
            <p className="font-semibold">
              {location.bestSeasons.map((s) => seasonLabels[s]).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — Camera simulator + time */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-2">关于此地</h2>
              <p className="text-muted-foreground leading-relaxed">{location.description}</p>
              <Link href={`/scout?location=${location.id}`} className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                以此地点创建拍摄计划
              </Link>
            </div>

            <div className="rounded-xl border border-border/30 p-4 text-xs text-muted-foreground space-y-2">
              <p>点位来源：{provenance.source} · 坐标体系：{provenance.coordinateSystem}</p>
              <p>{provenance.note}</p>
            </div>
            {/* Scenery tags */}
            <div className="flex flex-wrap gap-2">
              {location.sceneryTags.map((tag) => {
                const info = sceneryTypes[tag];
                return (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="px-3 py-1 text-sm"
                    style={{
                      borderColor: info?.color + '60',
                      color: info?.color,
                    }}
                  >
                    {info?.icon} {info?.label}

                  </Badge>
                );
              })}
            </div>

            {/* Camera Simulator */}
            <div>
              <h3 className="text-lg font-semibold mb-3">构图与光线示意</h3>
              <CameraSimulator
                locationId={location.id}
                coordinates={effectiveCoordinates}
                elevation={location.elevation}
                timeZone={timeZone}
                currentDate={selectedDate}
              />
            </div>

            {/* Time Slider */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <label className="block text-sm mb-4">拍摄日期
                <input aria-label="拍摄日期" type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} className="block bg-card border border-border rounded-lg p-2 mt-2" />
              </label>
              <TimeSlider
                timeOfDay={timeOfDay}
                onChange={setTimeOfDay}
                sunMoonData={sunMoonData}
                dateKey={dateKey}
                timeZone={timeZone}
              />
            </div>

            <div id="shooting-plan" className="scroll-mt-24">
              <ShootingPlanner key={location.id} location={location} onVantageChange={onVantageChange} />
            </div>
            {/* Photo Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-3">地点实拍与来源</h3>
              <p className="text-xs text-muted-foreground mb-3">图片对应此地点或标明的子地点；图片坐标不等于已校准机位。点击可查看原始文件与许可。</p>
              <PhotoGrid photos={location.photos} locationName={location.name} />
              {location.photos.length === 0 && <p className="text-sm text-muted-foreground">暂无可展示的已核验实拍。</p>}
              {location.photos.map((photo) => (
                <div key={photo.sourceUrl} className="mt-3 rounded-lg border border-border/30 p-3 text-xs text-muted-foreground">
                  <p>{photo.caption} · 摄影：{photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a></p>
                  <p className="mt-1">地点依据：{photo.placeEvidence}</p>
                  <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">查看 Wikimedia Commons 原始文件</a>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar — Astronomy + Controls */}
          <div className="space-y-6">
            {/* Camera Controls */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <CameraControls />
            </div>

            {/* Sun Path */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <SunPathDiagram sunMoonData={sunMoonData} timeOfDay={timeOfDay} coordinates={effectiveCoordinates} date={selectedDate} timeZone={timeZone} />
            </div>

            {/* Golden Hour */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <GoldenHourDisplay sunMoonData={sunMoonData} currentDate={selectedDate} timeZone={timeZone} />
            </div>

            {/* Best viewing directions */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <p className="text-sm font-medium mb-3">推荐拍摄方向</p>
              <div className="flex gap-2 flex-wrap">
                {location.bestViewingDirections.map((dir) => {
                  const dirNames: Record<number, string> = {
                    0: '北 N',
                    45: '东北 NE',
                    90: '东 E',
                    135: '东南 SE',
                    180: '南 S',
                    225: '西南 SW',
                    270: '西 W',
                    315: '西北 NW',
                    360: '北 N',
                  };
                  const nearest = Math.round(dir / 45) * 45;
                  return (
                    <Badge key={dir} variant="secondary" className="font-mono text-xs">
                      <Compass className="w-3 h-3 mr-1" />
                      {dir}° {dirNames[nearest] || ''}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card rounded-xl p-5 border border-border/30">
              <p className="text-sm font-medium mb-2">拍摄贴士</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{location.notes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
