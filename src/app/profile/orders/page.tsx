'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingBag, Package, Truck, CheckCircle2, Clock } from 'lucide-react';

interface OrderItem {
  skuId?: string;
  bundleId?: string;
  model?: string;
  bezelColor?: string;
  price: number;
  qty: number;
}

interface FrameOrder {
  id: string;
  status: string;
  totalAmount: number;
  paymentMethod: string | null;
  itemsJson: OrderItem[];
  shippingAddress: { name: string; phone: string; address: string } | null;
  shippingTrackingNo: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

const statusFlow: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: '待付款', icon: Clock, color: 'text-muted-foreground' },
  paid: { label: '已付款', icon: Package, color: 'text-glow' },
  shipped: { label: '已发货', icon: Truck, color: 'text-glow' },
  delivered: { label: '已送达', icon: CheckCircle2, color: 'text-emerald-400' },
  cancelled: { label: '已取消', icon: Clock, color: 'text-muted-foreground' },
};

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<FrameOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/frame/orders')
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-glow" />
      </div>
    );
  }

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'pending')
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">MY ORDERS</p>
        <h1 className="text-3xl font-bold font-heading">我的订单</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {orders.length > 0
            ? `共 ${orders.length} 笔订单 · 累计 ¥${totalSpent.toFixed(2)}`
            : '还没有订单'}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">还没有电子相框订单</p>
          <Link href="/frame" className="inline-flex items-center gap-1 text-glow hover:underline">
            浏览相框商品 →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const flow = statusFlow[o.status] || statusFlow.pending;
            const Icon = flow.icon;
            return (
              <div
                key={o.id}
                className="bg-card border border-border/50 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/30 bg-muted/30">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                      订单号 {o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(o.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${flow.color}`}>
                    <Icon className="w-4 h-4" /> {flow.label}
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-2">
                    {o.itemsJson?.map((it, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{it.model || `内容包 #${it.bundleId?.slice(0, 6)}`}</span>
                          {it.bezelColor && (
                            <span className="text-muted-foreground text-xs ml-2">{it.bezelColor}</span>
                          )}
                          <span className="text-muted-foreground text-xs ml-2">× {it.qty}</span>
                        </div>
                        <span className="font-mono">¥{(it.price * it.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                    <div className="text-xs text-muted-foreground">
                      {o.shippingAddress && (
                        <span>收件人：{o.shippingAddress.name} · {o.shippingAddress.phone}</span>
                      )}
                      {o.shippingTrackingNo && (
                        <span className="ml-3 text-glow">快递号：{o.shippingTrackingNo}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">合计</span>
                      <span className="text-lg font-bold font-mono ml-2 text-glow">
                        ¥{o.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
