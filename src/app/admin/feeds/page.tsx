'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, Trash2 } from 'lucide-react';

interface Feed {
  id: string;
  name: string;
  locationId: string | null;
  type: 'official' | 'third_party';
  streamType: 'hls' | 'rtmp' | 'flv' | 'image' | 'mjpeg';
  isLive: boolean;
  status: string;
}

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFeeds() {
    const res = await fetch('/api/admin/feeds');
    const data = await res.json();
    setFeeds(data.feeds || []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFeeds();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('确定删除此摄像头？')) return;
    const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchFeeds();
    } else {
      alert('删除失败');
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
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Camera className="w-6 h-6 text-glow" />
        摄像头管理
      </h1>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">协议</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {feeds.map((feed) => (
              <tr key={feed.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-white">{feed.name}</td>
                <td className="px-4 py-3 text-white/60">
                  {feed.type === 'official' ? '官方' : '第三方'}
                </td>
                <td className="px-4 py-3 text-white/60 uppercase">{feed.streamType}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      feed.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {feed.status === 'active' ? '运行中' : feed.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/feeds/${feed.id}`}
                      className="text-glow hover:underline text-sm"
                    >
                      查看
                    </Link>
                    <button
                      onClick={() => handleDelete(feed.id)}
                      className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
