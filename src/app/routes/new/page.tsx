'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, GripVertical, Save, Loader2, ArrowLeft } from 'lucide-react';
import { locations } from '@/data/locations';
import { toast } from 'sonner';

interface StopForm {
  id: string;
  orderIndex: number;
  locationId: string;
  note: string;
  transportHint: string;
  bestTimeOfDay: string;
  staySuggestion: string;
}

const timeOptions = [
  { value: 'dawn', label: '黎明 5-6' },
  { value: 'morning', label: '上午 6-11' },
  { value: 'noon', label: '正午 11-14' },
  { value: 'afternoon', label: '下午 14-17' },
  { value: 'dusk', label: '黄昏 17-19' },
  { value: 'night', label: '夜晚 19后' },
];

const seasonOptions = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

export default function NewRoutePage() {
  const router = useRouter();
  const { status } = useSession();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [bestSeasons, setBestSeasons] = useState<string[]>(['spring', 'autumn']);
  const [coverImage, setCoverImage] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [stops, setStops] = useState<StopForm[]>([
    { id: '1', orderIndex: 0, locationId: '', note: '', transportHint: '', bestTimeOfDay: '', staySuggestion: '' },
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  function addStop() {
    setStops((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        orderIndex: prev.length,
        locationId: '',
        note: '',
        transportHint: '',
        bestTimeOfDay: '',
        staySuggestion: '',
      },
    ]);
  }

  function updateStop(id: string, patch: Partial<StopForm>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, orderIndex: i })));
  }

  function toggleSeason(v: string) {
    setBestSeasons((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('请填写标题');
      return;
    }
    if (stops.length < 2) {
      toast.error('至少添加 2 个停点');
      return;
    }
    if (stops.some((s) => !s.locationId)) {
      toast.error('每个停点需选择拍摄点');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          days: days ? parseInt(days) : undefined,
          difficulty,
          bestSeason: bestSeasons.join(','),
          coverImage: coverImage || undefined,
          status: publishNow ? 'published' : 'draft',
          stops: stops.map(({ id: _id, orderIndex, ...rest }) => ({ orderIndex, ...rest })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '创建失败');
        return;
      }
      toast.success(publishNow ? '线路已发布' : '草稿已保存');
      router.push(`/routes/${data.id}`);
    } catch {
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-glow" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/discover" className="inline-flex items-center text-sm text-muted-foreground hover:text-glow mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回发现
      </Link>

      <h1 className="text-3xl font-bold font-heading mb-1">创建度假线路</h1>
      <p className="text-sm text-muted-foreground mb-8">
        把你串过的拍摄点组成一条线路，全免费分享给其他驴友。线路内照片解锁仍归原作者分佣。
      </p>

      {/* Basic */}
      <div className="bg-card border border-border/50 rounded-xl p-5 mb-4 space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如 川西高原 7 日星空行"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">简介</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="行程节奏、最佳季节、装备建议..."
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">天数</label>
            <input
              type="number"
              min="1"
              max="60"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="如 7"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">难度 (1-5)</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">封面图 URL</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="选填，无则用第一停点照片"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">最佳季节</label>
          <div className="flex gap-2">
            {seasonOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSeason(s.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  bestSeasons.includes(s.value)
                    ? 'border-glow bg-glow/10 text-glow'
                    : 'border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stops */}
      <div className="bg-card border border-border/50 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-heading">行程序列</h2>
          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-1 text-sm text-glow hover:text-glow/80"
          >
            <Plus className="w-4 h-4" /> 添加停点
          </button>
        </div>
        <div className="space-y-3">
          {stops.map((stop, idx) => {
            const loc = locations.find((l) => l.id === stop.locationId);
            return (
              <div key={stop.id} className="border border-border/50 rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                  <span className="font-mono text-sm text-glow">STOP {String(idx + 1).padStart(2, '0')}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  {loc && (
                    <span className="text-xs text-muted-foreground truncate">{loc.name} · {loc.province}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    className="ml-auto text-destructive/60 hover:text-destructive"
                    disabled={stops.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">拍摄点 *</label>
                    <select
                      value={stop.locationId}
                      onChange={(e) => updateStop(stop.id, { locationId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— 选择拍摄点 —</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} · {l.province}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">最佳时段</label>
                    <select
                      value={stop.bestTimeOfDay}
                      onChange={(e) => updateStop(stop.id, { bestTimeOfDay: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— 不限 —</option>
                      {timeOptions.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">拍摄提示</label>
                    <input
                      value={stop.note}
                      onChange={(e) => updateStop(stop.id, { note: e.target.value })}
                      placeholder="如 山顶机位、向北偏东 45°、用 16mm"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">交通</label>
                    <input
                      value={stop.transportHint}
                      onChange={(e) => updateStop(stop.id, { transportHint: e.target.value })}
                      placeholder="如 景区入口徒步 1.5h"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">住宿</label>
                    <input
                      value={stop.staySuggestion}
                      onChange={(e) => updateStop(stop.id, { staySuggestion: e.target.value })}
                      placeholder="如 牛背山星辰客栈"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="accent-glow"
          />
          立即发布
        </label>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-glow text-black rounded-lg font-medium hover:bg-glow/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {publishNow ? '发布' : '保存草稿'}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-glow/50 focus:ring-1 focus:ring-glow/30 transition-colors';
