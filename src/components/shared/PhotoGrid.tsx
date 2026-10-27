'use client';

import { useState } from 'react';
import type { LocationMedia } from '@/types/location';
import { VerifiedPhoto } from './VerifiedPhoto';

interface PhotoGridProps {
  photos: LocationMedia[];
  locationName: string;
}

export function PhotoGrid({ photos, locationName }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.sourceUrl}
            onClick={() => setLightbox(i)}
            className="aspect-square overflow-hidden rounded-lg group relative"
          >
            <VerifiedPhoto photo={photo} alt={`${locationName}：${photo.caption}`} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center gap-4 p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setLightbox(null); }}
        >
          <div className="h-[70vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <VerifiedPhoto photo={photos[lightbox]} alt={`${locationName}：${photos[lightbox].caption}`} showCredit={false} fit="contain" />
          </div>
          <p className="max-w-3xl text-center text-sm text-white">
            {photos[lightbox].caption} · 摄影：{photos[lightbox].author} ·{' '}
            <a href={photos[lightbox].sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">原始文件</a> ·{' '}
            <a href={photos[lightbox].licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photos[lightbox].license}</a>
          </p>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
