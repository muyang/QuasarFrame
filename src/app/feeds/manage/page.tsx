'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Camera, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';

interface Feed {
  id: string;
  name: string;
  locationId: string | null;
  type: 'official' | 'third_party';
  streamType: 'hls' | 'rtmp' | 'flv' | 'image' | 'mjpeg';
  isLive: boolean;
  status: string;
}

export default function ManageFeedsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    locationId: string;
    streamUrl: string;
    snapshotUrl: string;
    streamType: 'flv' | 'image';
    description: string;
    type: 'official' | 'third_party';
  }>({
    name: '',
    locationId: '',
    streamUrl: '',
    snapshotUrl: '',
    streamType: 'image',
    description: '',
    type: 'third_party',
  });

  async function fetchFeeds() {
    const res = await fetch('/api/feeds?mine=1&limit=100');
    const data = await res.json();
    setFeeds(data.feeds || []);
    setLoading(false);
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'authenticated') {
      // Any authenticated user can manage feeds they own.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchFeeds();
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({
        name: '',
        locationId: '',
        streamUrl: '',
        snapshotUrl: '',
        streamType: 'image',
        description: '',
        type: 'third_party',
      });
      fetchFeeds();
    } else {
      const data = await res.json();
      alert(data.error || '创建失败');
    }
  }

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Camera className="w-6 h-6 text-glow" />
        管理摄像头
      </h1>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          添加摄像头
        </h2>
        <p className="text-sm text-white/50 mb-4">提交后需核实画面分发授权，审核通过前不会公开。</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-1">名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">位置 ID</label>
            <input
              type="text"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">流协议</label>
            <select
              value={form.streamType}
              onChange={(e) => setForm({ ...form, streamType: e.target.value as 'flv' | 'image' })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
            >
              <option value="flv">FLV (HTTP-FLV)</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-1">流地址</label>
            <input
              type="url"
              value={form.streamUrl}
              onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-1">快照地址</label>
            <input
              type="url"
              value={form.snapshotUrl}
              onChange={(e) => setForm({ ...form, snapshotUrl: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-glow"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-glow text-black rounded-lg font-medium hover:bg-glow/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              创建
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="text-white font-medium">{feed.name}</h3>
              <p className="text-white/40 text-sm mt-0.5">
                {feed.type === 'official' ? '官方' : '第三方'} · {feed.streamType.toUpperCase()} · {' '}
                {feed.status === 'active' ? '运行中' : feed.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/feeds/${feed.id}`)}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                title="查看"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(feed.id)}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
