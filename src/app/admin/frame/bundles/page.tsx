'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Save, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FrameBundle {
  id: string;
  skuId: string | null;
  name: string;
  description: string | null;
  photoIds: string[];
  royaltyRule: { type: 'percent' | 'fixed'; value: number };
  price: number;
  status: string;
  createdAt: string;
}

interface FrameSku {
  id: string;
  model: string;
  screenInch: number;
  bezelColor: string;
  status: string;
}

interface BundleForm {
  skuId: string; // '' = standalone
  name: string;
  description: string;
  photoIds: string; // newline-separated
  royaltyType: 'percent' | 'fixed';
  royaltyValue: string;
  price: string;
  status: 'active' | 'retired';
}

const EMPTY_FORM: BundleForm = {
  skuId: '',
  name: '',
  description: '',
  photoIds: '',
  royaltyType: 'percent',
  royaltyValue: '0.5',
  price: '0',
  status: 'active',
};

async function fetchBundleCatalogue() {
  const [b, s] = await Promise.all([
    fetch('/api/admin/frame/bundles').then((response) => response.json()),
    fetch('/api/admin/frame/skus').then((response) => response.json()),
  ]);
  return { bundles: (b.bundles || []) as FrameBundle[], skus: (s.skus || []) as FrameSku[] };
}

export default function AdminFrameBundlesPage() {
  const [bundles, setBundles] = useState<FrameBundle[]>([]);
  const [skus, setSkus] = useState<FrameSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FrameBundle | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BundleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBundleCatalogue();
      setBundles(data.bundles);
      setSkus(data.skus);
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchBundleCatalogue()
      .then((data) => {
        if (!active) return;
        setBundles(data.bundles);
        setSkus(data.skus);
      })
      .catch(() => { if (active) toast.error('加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  }

  function startEdit(b: FrameBundle) {
    setForm({
      skuId: b.skuId || '',
      name: b.name,
      description: b.description || '',
      photoIds: (b.photoIds || []).join('\n'),
      royaltyType: b.royaltyRule?.type || 'percent',
      royaltyValue: String(b.royaltyRule?.value ?? 0.5),
      price: String(b.price),
      status: b.status as 'active' | 'retired',
    });
    setEditing(b);
    setCreating(true);
  }

  function closeEditor() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...(form.skuId ? { skuId: form.skuId } : {}),
        name: form.name,
        description: form.description || undefined,
        photoIds: form.photoIds
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        royaltyRule: {
          type: form.royaltyType,
          value: parseFloat(form.royaltyValue),
        },
        price: parseFloat(form.price),
        status: form.status,
      };

      const url = editing
        ? `/api/admin/frame/bundles/${editing.id}`
        : '/api/admin/frame/bundles';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '保存失败');
        setSaving(false);
        return;
      }
      toast.success(editing ? '已更新' : '已创建');
      closeEditor();
      await load();
    } catch {
      toast.error('网络错误');
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: FrameBundle) {
    if (!confirm(`确认永久删除内容包「${b.name}」？`)) return;
    const res = await fetch(`/api/admin/frame/bundles/${b.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('已删除');
      await load();
    } else {
      toast.error('删除失败');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">
            ADMIN · FRAME · BUNDLES
          </p>
          <h1 className="text-3xl font-bold font-heading">内容包管理</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {bundles.length} 个内容包 · 自动触发摄影作品分佣
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="w-4 h-4" /> 新建内容包
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-glow" />
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">还没有内容包</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              <tr>
                <th className="text-left p-3">名称</th>
                <th className="text-left p-3">关联 SKU</th>
                <th className="text-right p-3">照片数</th>
                <th className="text-right p-3">分佣规则</th>
                <th className="text-right p-3">价格</th>
                <th className="text-center p-3">状态</th>
                <th className="text-center p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b) => {
                const linkedSku = skus.find((s) => s.id === b.skuId);
                return (
                  <tr key={b.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="p-3">
                      <p className="font-medium">{b.name}</p>
                      {b.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{b.description}</p>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {linkedSku ? `${linkedSku.model} ${linkedSku.screenInch}″` : '独立'}
                    </td>
                    <td className="p-3 text-right font-mono">{b.photoIds.length}</td>
                    <td className="p-3 text-right font-mono text-xs">
                      {b.royaltyRule?.type === 'percent'
                        ? `${(b.royaltyRule.value * 100).toFixed(0)}%`
                        : `¥${b.royaltyRule.value}`}
                    </td>
                    <td className="p-3 text-right font-mono">¥{b.price.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          b.status === 'active'
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                            : 'bg-muted text-muted-foreground border-border/50'
                        }
                      >
                        {b.status === 'active' ? '在售' : '已退'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(b)}
                          className="p-1.5 hover:bg-muted rounded"
                          aria-label="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => remove(b)}
                          className="p-1.5 hover:bg-muted rounded text-red-400"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closeEditor} aria-hidden />
          <div className="relative ml-auto w-full max-w-xl bg-card border-l border-border/50 h-full overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/30 px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl">
                {editing ? '编辑内容包' : '新建内容包'}
              </h2>
              <button onClick={closeEditor} className="p-1.5 hover:bg-muted rounded-lg" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="名称" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="如 黄山日出系列" />
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  关联 SKU（可选 — 不选为独立内容包）
                </span>
                <select
                  value={form.skuId}
                  onChange={(e) => setForm({ ...form, skuId: e.target.value })}
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
                >
                  <option value="">独立内容包</option>
                  {skus.filter((s) => s.status === 'active').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.model} {s.screenInch}″ {s.bezelColor}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  描述
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="内容包简介"
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  照片 ID（每行一个）
                </span>
                <textarea
                  value={form.photoIds}
                  onChange={(e) => setForm({ ...form, photoIds: e.target.value })}
                  rows={4}
                  placeholder={"photo-id-1\nphoto-id-2"}
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-glow/60"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  分佣总额将平均分配给所有照片的作者
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                    分佣类型
                  </span>
                  <select
                    value={form.royaltyType}
                    onChange={(e) => setForm({ ...form, royaltyType: e.target.value as BundleForm['royaltyType'] })}
                    className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
                  >
                    <option value="percent">百分比（0-1）</option>
                    <option value="fixed">固定金额</option>
                  </select>
                </label>
                <Field
                  label="分佣值"
                  value={form.royaltyValue}
                  onChange={(v) => setForm({ ...form, royaltyValue: v })}
                  placeholder="0.5"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="内容包价格（元）"
                  value={form.price}
                  onChange={(v) => setForm({ ...form, price: v })}
                  placeholder="0"
                  type="number"
                />
                <label className="block">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                    状态
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as BundleForm['status'] })}
                    className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
                  >
                    <option value="active">在售</option>
                    <option value="retired">已退</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border/30 p-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeEditor}>取消</Button>
              <Button
                className="flex-1"
                disabled={saving || !form.name || !form.photoIds.trim()}
                onClick={save}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editing ? '保存修改' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
      />
    </label>
  );
}
