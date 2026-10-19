import Link from 'next/link';
import { CheckCircle, Camera, Users, ShoppingBag, Layers, ArrowRight } from 'lucide-react';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, photos, cameraFeeds, frameOrders, routes } from '@/db/schema';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [userCount] = await db.select({ c: sql<number>`count(*)` }).from(users);
    const [photoCount] = await db.select({ c: sql<number>`count(*)` }).from(photos);
    const [pendingPhotos] = await db
      .select({ c: sql<number>`count(*)` })
      .from(photos)
      .where(eq(photos.status, 'pending'));
    const [feedCount] = await db.select({ c: sql<number>`count(*)` }).from(cameraFeeds);
    const [orderCount] = await db.select({ c: sql<number>`count(*)` }).from(frameOrders);
    const [routeCount] = await db.select({ c: sql<number>`count(*)` }).from(routes);
    const [pendingOrders] = await db
      .select({ c: sql<number>`count(*)` })
      .from(frameOrders)
      .where(eq(frameOrders.status, 'paid'));

    const recentUsers = await db
      .select({ id: users.id, name: users.name, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    return {
      userCount: userCount?.c ?? 0,
      photoCount: photoCount?.c ?? 0,
      pendingPhotos: pendingPhotos?.c ?? 0,
      feedCount: feedCount?.c ?? 0,
      orderCount: orderCount?.c ?? 0,
      pendingOrders: pendingOrders?.c ?? 0,
      routeCount: routeCount?.c ?? 0,
      recentUsers,
    };
  } catch (e) {
    console.error('[admin/overview] stats failed', e);
    return null;
  }
}

const cards = [
  { href: '/admin/review', icon: CheckCircle, title: '照片审核', desc: 'UGC 照片审核队列', soon: false },
  { href: '/admin/feeds', icon: Camera, title: '摄像头管理', desc: '直播风景流接入与状态', soon: false },
  { href: '/admin/users', icon: Users, title: '用户管理', desc: '角色、会员、余额', soon: false },
  { href: '/admin/frame/skus', icon: Layers, title: '相框 SKU', desc: '商品与库存', soon: false },
  { href: '/admin/frame/orders', icon: ShoppingBag, title: '相框订单', desc: '发货状态流转', soon: false },
  { href: '/admin/frame/bundles', icon: Layers, title: '内容包', desc: '版权分佣配置', soon: false },
];

export default async function AdminOverviewPage() {
  const stats = await getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-glow/70 mb-2 font-mono">ADMIN</p>
        <h1 className="text-3xl font-bold font-heading">后台总览</h1>
        <p className="text-muted-foreground mt-2 text-sm">平台运营数据速览</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <Stat label="用户" value={stats.userCount} sub={`${stats.recentUsers.length} 近期`} />
          <Stat label="照片" value={stats.photoCount} sub={`${stats.pendingPhotos} 待审`} highlight={stats.pendingPhotos > 0} />
          <Stat label="摄像头" value={stats.feedCount} />
          <Stat label="相框订单" value={stats.orderCount} sub={`${stats.pendingOrders} 待发货`} highlight={stats.pendingOrders > 0} />
          <Stat label="线路" value={stats.routeCount} />
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl p-6 mb-8 text-muted-foreground text-sm">
          统计数据加载失败。
        </div>
      )}

      <h2 className="text-xl font-semibold font-heading mb-4">管理工作台</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={`${c.href}-${c.title}`}
              href={c.href}
              className={`group bg-card border rounded-xl p-5 transition-all card-lift ${c.soon ? 'border-border/30 opacity-70 cursor-default' : 'border-border/50 hover:border-glow/40'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-glow/10 text-glow flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                {c.soon ? (
                  <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground/70">即将上线</span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-glow group-hover:translate-x-1 transition-all" />
                )}
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`bg-card border rounded-xl p-5 ${highlight ? 'border-glow/40 bg-glow/5' : 'border-border/50'}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
