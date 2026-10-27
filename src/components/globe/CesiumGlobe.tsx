'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocationStore } from '@/stores/useLocationStore';
import { locations } from '@/data/locations';
import type { Location } from '@/types/location';
import CesiumViewer from './CesiumViewer';
import { VerifiedPhoto } from '@/components/shared/VerifiedPhoto';

export function CesiumGlobe() {
  const router = useRouter();
  const setSelectedLocationId = useLocationStore((s) => s.setSelectedLocationId);
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);

  const handleMarkerClick = (loc: Location) => {
    setSelectedLoc(loc);
    setSelectedLocationId(loc.id);
  };

  const handleExplore = () => {
    if (selectedLoc) {
      router.push(`/location/${selectedLoc.id}`);
    }
  };

  return (
    <div className="relative w-full h-full">
      <CesiumViewer
        locations={locations}
        onMarkerClick={handleMarkerClick}
      />

      {/* Location info overlay */}
      {selectedLoc && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:bottom-6 md:w-96 z-10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
            <div className="aspect-video overflow-hidden">
              <VerifiedPhoto photo={selectedLoc.photos[0]} alt={`${selectedLoc.name}：${selectedLoc.photos[0]?.caption ?? '地点照片待核验'}`} />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl">{selectedLoc.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLoc.nameEn}</p>
                </div>
                <button
                  onClick={() => setSelectedLoc(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {selectedLoc.description}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedLoc.sceneryTags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-accent-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleExplore}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  探索详情 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      {!selectedLoc && (
        <div className="absolute top-6 left-6 z-10 bg-card/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/30">
          <p className="text-sm text-muted-foreground">
            🖱️ 拖拽旋转地球 · 点击标记查看详情 · 滚轮缩放
          </p>
        </div>
      )}
    </div>
  );
}
