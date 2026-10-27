'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { LocationMedia } from '@/types/location';

export function VerifiedPhoto({
  photo,
  alt,
  className = '',
  showCredit = true,
  fit = 'cover',
}: {
  photo?: LocationMedia | null;
  alt: string;
  className?: string;
  showCredit?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const available = Boolean(photo?.imageUrl) && photo?.imageUrl !== failedUrl;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {available && photo ? (
        <>
          {/* Wikimedia thumbnails are external assets with their own attribution and license. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imageUrl}
            alt={alt}
            className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
            onError={() => setFailedUrl(photo.imageUrl)}
          />
          {showCredit && (
            <span className="absolute bottom-2 right-2 max-w-[calc(100%-1rem)] truncate rounded bg-black/70 px-2 py-1 text-[10px] text-white">
              实拍 · {photo.author} · {photo.license}
            </span>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-3 text-center text-slate-300">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs">{photo ? '实拍图暂无法加载' : '暂无已核验实拍'}</span>
        </div>
      )}
    </div>
  );
}
