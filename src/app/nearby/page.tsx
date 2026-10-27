'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Mountain } from 'lucide-react';
import { locations } from '@/data/locations';
import { sceneryTypes } from '@/data/scenery-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VerifiedPhoto } from '@/components/shared/VerifiedPhoto';
import { PRESET_CITIES } from '@/lib/constants';
import {
  haversineDistance,
  formatDistance,
} from '@/lib/distance';

const difficultyLabels = ['', '轻松', '简单', '中等', '较难', '专业'];

export default function NearbyPage() {
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('chengdu');
  const manualCityRef = useRef(false);

  // Try geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!manualCityRef.current) setUserCoords([pos.coords.longitude, pos.coords.latitude]);
        },
        () => {
          // Rendering already falls back to the current city, including manual changes.
        },
        { timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  const sortedLocations = useMemo(() => {
    const coords = userCoords || PRESET_CITIES[selectedCity]?.coordinates;
    if (!coords) return [];
    return locations
      .map((loc) => ({
        ...loc,
        distance: haversineDistance(coords, loc.coordinates),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [userCoords, selectedCity]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">附近推荐</h1>
            <p className="text-muted-foreground mt-2">按直线距离浏览地点；实际行程时间需以路网与步行路线为准</p>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <select
              aria-label="附近地点基准城市"
              value={selectedCity}
              onChange={(e) => {
                manualCityRef.current = true;
                setSelectedCity(e.target.value);
                const city = PRESET_CITIES[e.target.value];
                if (city) setUserCoords(city.coordinates);
              }}
              className="bg-card border border-border/30 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(PRESET_CITIES).map(([key, city]) => (
                <option key={key} value={key}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">图片已按地点来源核对；内置坐标仍是区域示意，尚未接入路线计算和现场气象。</p>
        {/* Location list */}
        <div className="space-y-4">
          {sortedLocations.map((loc, i) => {

            return (
              <Link key={loc.id} href={`/location/${loc.id}`}>
                <Card className="group border-border/30 hover:border-primary/30 transition-all">
                  <CardContent className="p-0 flex">
                    {/* Thumbnail */}
                    <div className="w-32 sm:w-40 aspect-square shrink-0 overflow-hidden">
                      <VerifiedPhoto photo={loc.photos[0]} alt={`${loc.name}：${loc.photos[0]?.caption ?? '地点照片待核验'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{loc.name}</h3>
                            <p className="text-xs text-muted-foreground">{loc.nameEn} · {loc.province}</p>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            #{i + 1}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {loc.sceneryTags.slice(0, 3).map((tag) => (
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
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          直线 {formatDistance(loc.distance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3 h-3" />
                          {difficultyLabels[loc.difficulty]}
                        </span>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
