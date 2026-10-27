'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

interface Photo {
  id: string;
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  priceType: 'free' | 'paid';
  price: number;
  author: { name: string; email: string };
  createdAt: string;
  licenseStatus: string;
}

export default function AdminReviewPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    const res = await fetch('/api/admin/photos?status=pending');
    const data = await res.json();
    setPhotos(data.photos || []);
    setLoading(false);
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    const res = await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status,
        rejectReason: status === 'rejected' ? rejectReason[id] : undefined,
      }),
    });
    if (res.ok) {
      fetchPhotos();
    } else {
      alert('审核失败');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-glow/30 border-t-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">内容审核</h1>
      <Link href="/admin/licenses" className="inline-block text-sm text-glow underline mb-6">审核作品分发授权</Link>

      {photos.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <p>暂无待审核内容</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="relative aspect-square bg-black/20">
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                <h3 className="text-white font-medium truncate">{photo.title}</h3>
                <p className="text-white/40 text-sm mt-1">{photo.author.name}</p>
                <p className="text-white/40 text-xs">{photo.author.email}</p>
                <p className="text-amber-300/80 text-xs mt-2">分发许可：{photo.licenseStatus}；内容审核通过后仍需有效许可才会公开。</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${photo.priceType === 'paid' ? 'bg-glow/20 text-glow' : 'bg-white/10 text-white/60'}`}>
                    {photo.priceType === 'paid' ? `¥${photo.price}` : '免费'}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <textarea
                    placeholder="拒绝原因（可选）"
                    value={rejectReason[photo.id] || ''}
                    onChange={(e) =>
                      setRejectReason({ ...rejectReason, [photo.id]: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-glow"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(photo.id, 'approved')}
                      className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      通过
                    </button>
                    <button
                      onClick={() => handleReview(photo.id, 'rejected')}
                      className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
