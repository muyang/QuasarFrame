'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Ban, X, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FrameSku {
  id: string;
  model: string;
  screenInch: number;
  bezelColor: string;
  price: number;
  stock: number;
  images: string[];
  specs: Record<string, string>;
  status: string;
  createdAt: string;
}

interface SkuForm {
  model: string;
  screenInch: string;
  bezelColor: string;
  price: string;
  stock: string;
  images: string; // newline-separated URLs
  specs: string; // key:value per line
  status: 'active' | 'discontinued';
}

const EMPTY_FORM: SkuForm = {
  model: '',
  screenInch: '',
  bezelColor: '',
  price: '',
  stock: '0',
  images: '',
  specs: '',
  status: 'active',
};

async function fetchSkus(): Promise<FrameSku[]> {
  const response = await fetch('/api/admin/frame/skus');
  const data = await response.json();
  return data.skus || [];
}

export default function AdminFrameSkusPage() {
  const [skus, setSkus] = useState<FrameSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FrameSku | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SkuForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSkus(await fetchSkus());
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSkus()
      .then((items) => { if (active) setSkus(items); })
      .catch(() => { if (active) toast.error('加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  }

  function startEdit(sku: FrameSku) {
    setForm({
      model: sku.model,
      screenInch: String(sku.screenInch),
      bezelColor: sku.bezelColor,
      price: String(sku.price),
      stock: String(sku.stock),
      images: (sku.images || []).join('\n'),
      specs: Object.entries(sku.specs || {})
        .map(([k, v]) => `${k}:${v}`)
        .join('\n'),
      status: sku.status as 'active' | 'discontinued',
    });
    setEditing(sku);
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
        model: form.model,
        screenInch: parseFloat(form.screenInch),
        bezelColor: form.bezelColor,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        images: form.images
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        specs: Object.fromEntries(
          form.specs
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((line) => {
              const i = line.indexOf(':');
              return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : null;
            })
            .filter(Boolean) as [string, string][]
        ),
        status: form.status,
      };

      const url = editing
        ? `/api/admin/frame/skus/${editing.id}`
        : '/api/admin/frame/skus';
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

  async function discontinue(sku: FrameSku) {
    if (!confirm(`确认下架 ${sku.model}？已有订单将不受影响。`)) return;
    const res = await fetch(`/api/admin/frame/skus/${sku.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('已下架');
      await load();
    } else {
      toast.error('下架失败');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">
            ADMIN · FRAME · SKUS
          </p>
          <h1 className="text-3xl font-bold font-heading">相框 SKU 管理</h1>
          <p className="text-muted-foreground mt-2 text-sm">{skus.length} 个型号（含已下架）</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="w-4 h-4" /> 新建 SKU
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-glow" />
        </div>
      ) : skus.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <p className="text-muted-foreground">还没有 SKU，点击右上角创建</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              <tr>
                <th className="text-left p-3">型号</th>
                <th className="text-left p-3">屏幕</th>
                <th className="text-left p-3">边框</th>
                <th className="text-right p-3">价格</th>
                <th className="text-right p-3">库存</th>
                <th className="text-center p-3">状态</th>
                <th className="text-center p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => (
                <tr key={s.id} className="border-t border-border/30 hover:bg-muted/20">
                  <td className="p-3 font-medium">{s.model}</td>
                  <td className="p-3 font-mono">{s.screenInch}″</td>
                  <td className="p-3">{s.bezelColor}</td>
                  <td className="p-3 text-right font-mono">¥{s.price.toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono ${s.stock <= 5 ? 'text-amber-400' : ''}`}>
                    {s.stock}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className={
                        s.status === 'active'
                          ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                          : 'bg-muted text-muted-foreground border-border/50'
                      }
                    >
                      {s.status === 'active' ? '在售' : '已下架'}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 hover:bg-muted rounded"
                        aria-label="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {s.status === 'active' && (
                        <button
                          onClick={() => discontinue(s)}
                          className="p-1.5 hover:bg-muted rounded text-red-400"
                          aria-label="下架"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
                {editing ? '编辑 SKU' : '新建 SKU'}
              </h2>
              <button onClick={closeEditor} className="p-1.5 hover:bg-muted rounded-lg" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="型号名" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="如 QuasarFrame Aurora 7" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="屏幕（英寸）" value={form.screenInch} onChange={(v) => setForm({ ...form, screenInch: v })} placeholder="7" type="number" />
                <Field label="边框色" value={form.bezelColor} onChange={(v) => setForm({ ...form, bezelColor: v })} placeholder="曜石黑" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="价格（元）" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="899" type="number" />
                <Field label="库存" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} placeholder="200" type="number" />
              </div>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  图片 URL（每行一条）
                </span>
                <textarea
                  value={form.images}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                  rows={3}
                  placeholder="https://..."
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-glow/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  规格（每行 key:value）
                </span>
                <textarea
                  value={form.specs}
                  onChange={(e) => setForm({ ...form, specs: e.target.value })}
                  rows={4}
                  placeholder={"resolution:1280×800\npanel:IPS\nratio:4:3"}
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-glow/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  状态
                </span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as SkuForm['status'] })}
                  className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
                >
                  <option value="active">在售</option>
                  <option value="discontinued">已下架</option>
                </select>
              </label>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border/30 p-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeEditor}>取消</Button>
              <Button
                className="flex-1"
                disabled={saving || !form.model || !form.screenInch || !form.bezelColor || !form.price}
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
