'use client';

import { useRef, useEffect } from 'react';
import { useCesium } from '@/hooks/useCesium';
import type { Location } from '@/types/location';

interface CesiumViewerProps {
  locations: Location[];
  onMarkerClick: (loc: Location) => void;
}

export default function CesiumViewer({ locations, onMarkerClick }: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewer, addMarkers } = useCesium(containerRef, {
    ionToken: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN,
    initialPosition: { lng: 105, lat: 35, height: 4_000_000 },
  });

  useEffect(() => {
    if (viewer) {
      addMarkers(locations, onMarkerClick);
    }
  }, [viewer, locations, addMarkers, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#0a0a0f' }}
    />
  );
}
