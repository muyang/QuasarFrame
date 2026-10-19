'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Tv, ShoppingBag, X, Minus, Plus, Loader2,
  Wallet, Truck, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
}

interface FrameBundle {
  id: string;
  skuId: string | null;
  name: string;
  description: string | null;
  photoIds: string[];
  royaltyRule: { type: 'percent' | 'fixed'; value: number };
  price: number;
  status: string;
}

interface CartLine {
  skuId: string;
  quantity: number;
  bundleId?: string;
  skuModel: string;
  skuScreenInch: number;
  skuBezelColor: string;
  skuPrice: number;
  bundleName?: string;
  bundlePrice: number;
}

export default function FramePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [skus, setSkus] = useState<FrameSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSkuId, setActiveSkuId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/frame/skus')
      .then((r) => r.json())
      .then((data) => {
        setSkus(data.skus || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('商品加载失败');
        setLoading(false);
      });
  }, []);

  const activeSkuDetail = useMemo(() => {
    if (!activeSkuId) return null;
    return skus.find((s) => s.id === activeSkuId) ?? null;
  }, [activeSkuId, skus]);

  const [detailBundles, setDetailBundles] = useState<{ skuId: string; bundles: FrameBundle[] } | null>(null);
  useEffect(() => {
    if (!activeSkuId) return;
    fetch(`/api/frame/skus/${activeSkuId}`)
      .then((r) => r.json())
      .then((data) => setDetailBundles({ skuId: activeSkuId, bundles: data.bundles || [] }))
      .catch(() => setDetailBundles({ skuId: activeSkuId, bundles: [] }));
  }, [activeSkuId]);
  const visibleDetailBundles = detailBundles?.skuId === activeSkuId ? detailBundles.bundles : [];

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce(
    (s, l) => s + (l.skuPrice + l.bundlePrice) * l.quantity,
    0
  );

  function addToCart(sku: FrameSku, qty: number, bundle?: FrameBundle) {
    const existingIdx = cart.findIndex(
      (l) =>
        l.skuId === sku.id &&
        ((l.bundleId ?? undefined) === (bundle?.id ?? undefined))
    );
    if (existingIdx >= 0) {
      setCart((prev) =>
        prev.map((l, i) =>
          i === existingIdx
            ? { ...l, quantity: Math.min(l.quantity + qty, 50) }
            : l
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          skuId: sku.id,
          quantity: qty,
          bundleId: bundle?.id,
          skuModel: sku.model,
          skuScreenInch: sku.screenInch,
          skuBezelColor: sku.bezelColor,
          skuPrice: sku.price,
          bundleName: bundle?.name,
          bundlePrice: bundle?.price ?? 0,
        },
      ]);
    }
    toast.success(`已加入购物车 · ${sku.model}`);
    setCartOpen(true);
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, quantity: Math.max(1, Math.min(50, l.quantity + delta)) } : l
      )
    );
  }

  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitOrder(form: {
    shippingAddress: Record<string, string>;
    paymentMethod: 'balance' | 'wechat' | 'alipay' | 'mock';
    requestKey: string;
  }) {
    if (status !== 'authenticated') {
      toast.error('请先登录');
      router.push('/auth/login');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/frame/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': form.requestKey },
        body: JSON.stringify({
          items: cart.map((l) => ({
            skuId: l.skuId,
            quantity: l.quantity,
            ...(l.bundleId ? { bundleId: l.bundleId } : {}),
          })),
          shippingAddress: form.shippingAddress,
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '下单失败');
        setSubmitting(false);
        return;
      }
      toast.success('下单成功');
      setCart([]);
      setCartOpen(false);
      router.push('/profile/orders');
    } catch {
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-glow/80 mb-2">
            <Tv className="w-3 h-3" /> QUASARFRAME
          </div>
          <h1 className="text-3xl font-bold font-heading">数码相框</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            4K 护眼墨水屏 · 自动同步你的拍摄作品 · 版权分账透明可追溯
          </p>
        </div>

        {skus.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border/50 rounded-xl">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">暂无在售型号</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {skus.map((sku) => (
              <SkuCard
                key={sku.id}
                sku={sku}
                onOpen={() => setActiveSkuId(sku.id)}
                onQuickAdd={() => addToCart(sku, 1)}
              />
            ))}
          </div>
        )}

        {activeSkuDetail && (
          <SkuDetailSheet
            sku={activeSkuDetail}
            bundles={visibleDetailBundles}
            onClose={() => setActiveSkuId(null)}
            onAdd={(qty, bundle) => addToCart(activeSkuDetail, qty, bundle)}
          />
        )}

        {cartOpen && <CartDrawer
          onClose={() => setCartOpen(false)}
          cart={cart}
          total={cartTotal}
          onUpdateQty={updateQty}
          onRemove={removeLine}
          onSubmit={submitOrder}
          submitting={submitting}
          authenticated={status === 'authenticated'}
        />}

        {cartCount > 0 && !cartOpen && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-glow text-background px-4 py-3 rounded-full shadow-lg hover:bg-glow/90 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">{cartCount}</span>
            <span className="font-mono text-sm">¥{cartTotal.toFixed(2)}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SkuCard({
  sku,
  onOpen,
  onQuickAdd,
}: {
  sku: FrameSku;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  const cover = sku.images?.[0] ||
    'https://images.unsplash.com/photo-1545239351-1141bd82b446?w=600&q=80';
  const lowStock = sku.stock <= 5 && sku.stock > 0;
  const outOfStock = sku.stock === 0;

  return (
    <Card className="group bg-card border-border/50 hover:border-glow/40 transition-all card-lift overflow-hidden">
      <button
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`查看 ${sku.model} 详情`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={sku.model}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span className="text-[10px] uppercase tracking-widest font-mono bg-background/80 backdrop-blur px-2 py-0.5 rounded text-glow">
              {sku.screenInch}″
            </span>
          </div>
          {outOfStock && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">已售罄</span>
            </div>
          )}
          {lowStock && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                仅剩 {sku.stock}
              </Badge>
            </div>
          )}
        </div>
      </button>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg group-hover:text-glow transition-colors">
          {sku.model}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sku.bezelColor} · {sku.specs?.resolution ?? ''}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-bold font-mono text-glow">
            ¥{sku.price.toFixed(0)}
          </span>
          <Button
            size="sm"
            variant={outOfStock ? 'secondary' : 'default'}
            disabled={outOfStock}
            onClick={onQuickAdd}
          >
            {outOfStock ? '已售罄' : '加入购物车'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkuDetailSheet({
  sku,
  bundles,
  onClose,
  onAdd,
}: {
  sku: FrameSku;
  bundles: FrameBundle[];
  onClose: () => void;
  onAdd: (qty: number, bundle?: FrameBundle) => void;
}) {
  const [qty, setQty] = useState(1);
  const [selectedBundleId, setSelectedBundleId] = useState<string | undefined>(undefined);
  const selectedBundle = bundles.find((b) => b.id === selectedBundleId);

  const images = sku.images?.length ? sku.images : [
    'https://images.unsplash.com/photo-1545239351-1141bd82b446?w=800&q=80',
  ];
  const [activeImg, setActiveImg] = useState(0);

  const totalPrice = (sku.price + (selectedBundle?.price ?? 0)) * qty;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative ml-auto w-full max-w-2xl bg-card border-l border-border/50 h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/30 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-heading text-xl">{sku.model}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[activeImg]}
                alt={`${sku.model} ${activeImg + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                      i === activeImg ? 'border-glow' : 'border-border/50'
                    }`}
                    aria-label={`查看第 ${i + 1} 张图`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-3">
              规格
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(sku.specs || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">屏幕</span>
                <span className="font-mono">{sku.screenInch}″</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">边框</span>
                <span className="font-mono">{sku.bezelColor}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">库存</span>
                <span className="font-mono">{sku.stock}</span>
              </div>
            </div>
          </div>

          {bundles.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-3">
                内容包（可选）
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedBundleId(undefined)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    !selectedBundleId
                      ? 'border-glow bg-glow/5'
                      : 'border-border/50 hover:border-glow/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">不选内容包（仅购买硬件）</span>
                  </div>
                </button>
                {bundles.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBundleId(b.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedBundleId === b.id
                        ? 'border-glow bg-glow/5'
                        : 'border-border/50 hover:border-glow/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        {b.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {b.photoIds.length} 张作品 · 版权分账 {b.royaltyRule.type === 'percent'
                            ? `${(b.royaltyRule.value * 100).toFixed(0)}%`
                            : `¥${b.royaltyRule.value}`}
                        </p>
                      </div>
                      <span className="font-mono text-sm">+¥{b.price.toFixed(0)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border/30 pt-6 sticky bottom-0 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">数量</span>
                <div className="flex items-center border border-border/50 rounded-lg">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-2 hover:bg-muted"
                    aria-label="减少"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-10 text-center font-mono">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(sku.stock, q + 1))}
                    className="p-2 hover:bg-muted"
                    aria-label="增加"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                  小计
                </p>
                <p className="text-2xl font-bold font-mono text-glow">
                  ¥{totalPrice.toFixed(2)}
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={sku.stock === 0}
              onClick={() => {
                onAdd(qty, selectedBundle);
                onClose();
              }}
            >
              {sku.stock === 0 ? '已售罄' : '加入购物车'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({
  onClose,
  cart,
  total,
  onUpdateQty,
  onRemove,
  onSubmit,
  submitting,
  authenticated,
}: {
  onClose: () => void;
  cart: CartLine[];
  total: number;
  onUpdateQty: (idx: number, delta: number) => void;
  onRemove: (idx: number) => void;
  onSubmit: (form: { shippingAddress: Record<string, string>; paymentMethod: 'balance' | 'wechat' | 'alipay' | 'mock'; requestKey: string }) => Promise<void>;
  submitting: boolean;
  authenticated: boolean;
}) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [requestKey, setRequestKey] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    zip: '',
  });

  const canSubmit = cart.length > 0 && form.name && form.phone && form.province && form.city && form.district && form.detail;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative ml-auto w-full max-w-md bg-card border-l border-border/50 h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/30 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-heading text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {step === 'cart' && `购物车 (${cart.reduce((s, l) => s + l.quantity, 0)})`}
            {step === 'checkout' && '确认订单'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  购物车是空的
                </div>
              ) : (
                cart.map((line, idx) => (
                  <div key={idx} className="bg-muted/30 rounded-lg p-3 border border-border/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {line.skuModel} {line.skuScreenInch}″ {line.skuBezelColor}
                        </p>
                        {line.bundleName && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            + {line.bundleName}
                          </p>
                        )}
                        <p className="text-xs font-mono mt-1">
                          ¥{(line.skuPrice + line.bundlePrice).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemove(idx)}
                        className="text-muted-foreground hover:text-red-400"
                        aria-label="移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border/50 rounded">
                        <button
                          onClick={() => onUpdateQty(idx, -1)}
                          className="px-2 py-1 hover:bg-muted"
                          aria-label="减少"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-mono">{line.quantity}</span>
                        <button
                          onClick={() => onUpdateQty(idx, 1)}
                          className="px-2 py-1 hover:bg-muted"
                          aria-label="增加"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-mono text-sm">
                        ¥{((line.skuPrice + line.bundlePrice) * line.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-border/30 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">合计</span>
                  <span className="text-2xl font-bold font-mono text-glow">¥{total.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!authenticated}
                  onClick={() => { setRequestKey(crypto.randomUUID()); setStep('checkout'); }}
                >
                  {authenticated ? '去结算' : '请先登录'}
                </Button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-3">
                收货地址
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="收件人" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="姓名" />
                  <Field label="电话" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="手机号" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="省" value={form.province} onChange={(v) => setForm({ ...form, province: v })} placeholder="省" />
                  <Field label="市" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="市" />
                  <Field label="区" value={form.district} onChange={(v) => setForm({ ...form, district: v })} placeholder="区" />
                </div>
                <Field label="详细地址" value={form.detail} onChange={(v) => setForm({ ...form, detail: v })} placeholder="街道、门牌号" />
                <Field label="邮编（可选）" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} placeholder="邮编" />
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-3">
                支付方式
              </h3>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <Wallet className="w-5 h-5 text-glow" />
                <div>
                  <p className="text-sm font-medium">余额支付</p>
                  <p className="text-xs text-muted-foreground">在线支付接入前暂仅支持余额支付</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/30 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">商品合计</span>
                <span className="font-mono">¥{total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">运费</span>
                <span className="font-mono text-emerald-400">包邮</span>
              </div>
              <div className="flex items-center justify-between text-base pt-2">
                <span>应付</span>
                <span className="text-2xl font-bold font-mono text-glow">¥{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('cart')}>
                返回
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!canSubmit || !requestKey || submitting}
                onClick={() =>
                  onSubmit({
                    shippingAddress: form,
                    paymentMethod: 'balance',
                    requestKey,
                  })
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 提交中
                  </>
                ) : (
                  '提交订单'
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Truck className="w-3 h-3" /> 下单后将在「我的订单」中查看支付与发货状态
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-background border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-glow/60"
      />
    </label>
  );
}
