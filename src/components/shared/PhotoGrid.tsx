'use client';

import { useState } from 'react';

interface PhotoGridProps {
  photos: string[];
  locationName: string;
}

export function PhotoGrid({ photos, locationName }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="aspect-square overflow-hidden rounded-lg group relative"
          >
            <img
              src={photo}
              alt={`${locationName} - ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={photos[lightbox]}
            alt={`${locationName} - ${lightbox + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
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
