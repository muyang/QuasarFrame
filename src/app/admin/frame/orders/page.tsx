'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, X, Truck, Save, Package, CheckCircle2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FrameOrderItem {
  skuId: string;
  quantity: number;
  amount: number;
  bundleId?: string;
  skuName?: string;
  bundleName?: string | null;
}

interface AdminOrder {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  itemsJson: FrameOrderItem[];
  totalAmount: number;
  shippingAddress: {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    zip?: string;
  } | null;
  trackingNo: string | null;
  status: 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'refunded' | 'cancelled';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS = [
  { id: '', label: '全部' },
  { id: 'pending_payment', label: '待付款' },
  { id: 'paid', label: '已付款' },
  { id: 'shipped', label: '已发货' },
  { id: 'delivered', label: '已送达' },
  { id: 'refunded', label: '已退款' },
  { id: 'cancelled', label: '已取消' },
];

const STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-muted text-muted-foreground border-border/50',
  paid: 'bg-glow/10 text-glow border-glow/30',
  shipped: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  delivered: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
  refunded: 'bg-red-400/10 text-red-400 border-red-400/30',
  cancelled: 'bg-muted text-muted-foreground border-border/50',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  shipped: '已发货',
  delivered: '已送达',
  refunded: '已退款',
  cancelled: '已取消',
};

const NEXT_ACTION: Record<string, { status: 'shipped' | 'delivered' | 'cancelled' | 'refunded'; label: string; icon: typeof Truck; needTracking?: boolean } | null> = {
  pending_payment: { status: 'cancelled', label: '取消订单', icon: Ban },
  paid: { status: 'shipped', label: '发货', icon: Truck, needTracking: true },
  shipped: { status: 'delivered', label: '确认送达', icon: CheckCircle2 },
  delivered: null,
  refunded: null,
  cancelled: null,
};

async function fetchOrders(filter: string): Promise<AdminOrder[]> {
  const url = `/api/admin/frame/orders${filter ? `?status=${filter}` : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.orders || [];
}

export default function AdminFrameOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [shipTarget, setShipTarget] = useState<AdminOrder | null>(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchOrders(filter));
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    fetchOrders(filter)
      .then((items) => { if (active) setOrders(items); })
      .catch(() => { if (active) toast.error('加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  async function advance(o: AdminOrder) {
    const action = NEXT_ACTION[o.status];
    if (!action) return;
    if (action.needTracking) {
      setShipTarget(o);
      setTrackingNo(o.trackingNo || '');
      return;
    }
    if (!confirm(`确认将订单 ${o.id.slice(0, 8).toUpperCase()} 标记为「${STATUS_LABEL[action.status]}」？`)) return;
    const res = await fetch(`/api/admin/frame/orders/${o.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action.status }),
    });
    if (res.ok) {
      toast.success('状态已更新');
      await load();
    } else {
      const data = await res.json();
      toast.error(data.error || '更新失败');
    }
  }

  async function saveShipping() {
    if (!shipTarget) return;
    if (!trackingNo.trim()) {
      toast.error('请填写运单号');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/frame/orders/${shipTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped', trackingNo: trackingNo.trim() }),
    });
    if (res.ok) {
      toast.success('已发货');
      setShipTarget(null);
      setTrackingNo('');
      await load();
    } else {
      const data = await res.json();
      toast.error(data.error || '发货失败');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">
          ADMIN · FRAME · ORDERS
        </p>
        <h1 className="text-3xl font-bold font-heading">相框订单管理</h1>
        <p className="text-muted-foreground mt-2 text-sm">{orders.length} 笔订单</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id || 'all'}
            onClick={() => { setLoading(true); setFilter(s.id); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s.id
                ? 'border-glow bg-glow/10 text-glow'
                : 'border-border/50 text-muted-foreground hover:border-glow/30'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-glow" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">没有符合筛选条件的订单</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const action = NEXT_ACTION[o.status];
            const ActionIcon = action?.icon;
            return (
              <div key={o.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border/30 bg-muted/30">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                      订单 {o.id.slice(0, 8).toUpperCase()} · {new Date(o.createdAt).toLocaleString('zh-CN')}
                    </p>
                    <p className="text-sm mt-0.5">
                      <span className="text-muted-foreground">客户：</span>
                      {o.userName || o.userId.slice(0, 8)} · {o.userEmail}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLE[o.status]}>
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </div>

                <div className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
                        商品
                      </p>
                      <div className="space-y-1">
                        {o.itemsJson.map((it, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>
                              {it.skuName || `SKU ${it.skuId.slice(0, 8)}`}
                              {it.bundleName && (
                                <span className="text-muted-foreground ml-2">+ {it.bundleName}</span>
                              )}
                              <span className="text-muted-foreground ml-2">× {it.quantity}</span>
                            </span>
                            <span className="font-mono">¥{(it.amount ?? 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
                        收货地址
                      </p>
                      {o.shippingAddress ? (
                        <div className="text-sm">
                          <p className="font-medium">{o.shippingAddress.name} · {o.shippingAddress.phone}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {o.shippingAddress.province} {o.shippingAddress.city} {o.shippingAddress.district}
                          </p>
                          <p className="text-muted-foreground text-xs">{o.shippingAddress.detail}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">无地址</p>
                      )}
                      {o.trackingNo && (
                        <p className="text-[10px] text-glow mt-2 font-mono">运单号：{o.trackingNo}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                    <div className="text-xs text-muted-foreground">
                      支付方式：<span className="text-foreground">{o.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-glow">¥{o.totalAmount.toFixed(2)}</span>
                      {action && ActionIcon && (
                        <Button size="sm" onClick={() => advance(o)}>
                          <ActionIcon className="w-3.5 h-3.5" /> {action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shipping dialog */}
      {shipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShipTarget(null)} aria-hidden />
          <div className="relative bg-card border border-border/50 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg">填写运单号</h2>
              <button onClick={() => setShipTarget(null)} className="p-1.5 hover:bg-muted rounded-lg" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              订单 {shipTarget.id.slice(0, 8).toUpperCase()} · ¥{shipTarget.totalAmount.toFixed(2)}
            </p>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                运单号
              </span>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="如 SF1234567890"
                className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-glow/60"
              />
            </label>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShipTarget(null)}>取消</Button>
              <Button className="flex-1" disabled={saving || !trackingNo.trim()} onClick={saveShipping}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                确认发货
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
