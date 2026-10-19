'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, Radio, Lock, Image as ImageIcon } from 'lucide-react';

interface Feed {
  id: string;
  name: string;
  locationId: string | null;
  type: 'official' | 'third_party';
  streamType: 'hls' | 'rtmp' | 'flv' | 'image' | 'mjpeg';
  isLive: boolean;
  thumbnailUrl: string | null;
  snapshotUrl: string | null;
  description: string | null;
  status: string;
}

export default function FeedsLivePage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feeds?limit=100')
      .then((r) => r.json())
      .then((data) => {
        setFeeds(data.feeds || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-glow" />
            实时风景摄像头
          </h1>
          <p className="text-white/50 mt-1">观看来自各地的实时风景直播与快照</p>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无摄像头资源</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {feeds.map((feed) => (
            <Link
              key={feed.id}
              href={`/feeds/${feed.id}`}
              className="group block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
            >
              <div className="relative aspect-video bg-black/30">
                {feed.thumbnailUrl || feed.snapshotUrl ? (
                  <Image
                    src={feed.thumbnailUrl || feed.snapshotUrl || ''}
                    alt={feed.name}
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                {feed.isLive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-red-500/90 text-white text-xs font-medium rounded">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
                {feed.type === 'third_party' && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-white text-xs rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    会员/解锁
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-white font-medium group-hover:text-glow transition-colors">
                  {feed.name}
                </h3>
                <p className="text-white/40 text-sm mt-1 line-clamp-2">{feed.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                  <span className="px-2 py-0.5 rounded bg-white/10">
                    {feed.type === 'official' ? '官方' : '第三方'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 uppercase">{feed.streamType}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
