'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useCesium } from '@/hooks/useCesium';
import type { Location } from '@/types/location';

interface CesiumViewerProps {
  locations: Location[];
  onMarkerClick: (loc: Location) => void;
}

export default function CesiumViewer({ locations, onMarkerClick }: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewer, error, addMarkers } = useCesium(containerRef, {
    ionToken: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN,
    initialPosition: { lng: 105, lat: 35, height: 4_000_000 },
  });

  useEffect(() => {
    if (viewer) {
      addMarkers(locations, onMarkerClick);
    }
  }, [viewer, locations, addMarkers, onMarkerClick]);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: '#0a0a0f' }}
      />
      {!viewer && !error && <div className="absolute inset-0 z-20 flex items-center justify-center bg-background" role="status">
        <p className="text-sm text-muted-foreground">加载数字地球…</p>
      </div>}
      {error && <div className="absolute inset-0 z-20 overflow-y-auto bg-background p-6 md:p-10">
        <h1 className="text-xl font-semibold">选景</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}。可以直接选择拍摄地查看照片、光线与拍摄计划。</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => <Link key={location.id} href={`/location/${location.id}`}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/60">
            <span className="font-medium">{location.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{location.province}</span>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{location.description}</p>
          </Link>)}
        </div>
      </div>}
    </>
  );
}
