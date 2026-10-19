import Link from 'next/link';
import { Globe, Camera, Tv, MapPin, ArrowRight, Sparkles, Radio } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { locations } from '@/data/locations';
import { sceneryTypes } from '@/data/scenery-types';
import { cn } from '@/lib/utils';
import { db } from '@/db';
import { cameraFeeds } from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { licensedFeedIds } from '@/lib/feed-access';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const featured = locations.slice(0, 4);

  const liveFeeds = await db
    .select({
      id: cameraFeeds.id,
      name: cameraFeeds.name,
      thumbnailUrl: cameraFeeds.thumbnailUrl,
      snapshotUrl: cameraFeeds.snapshotUrl,
      description: cameraFeeds.description,
      streamType: cameraFeeds.streamType,
      isLive: cameraFeeds.isLive,
      type: cameraFeeds.type,
    })
    .from(cameraFeeds)
    .where(and(eq(cameraFeeds.status, 'active'), inArray(cameraFeeds.id, licensedFeedIds())))
    .orderBy(desc(cameraFeeds.createdAt))
    .limit(3);
  const publishedFeeds = liveFeeds.map((feed) => ({
    ...feed,
    snapshotUrl: feed.type === 'official' && feed.snapshotUrl ? `/api/feeds/${feed.id}/snapshot` : null,
    thumbnailUrl: feed.type === 'official' && feed.snapshotUrl ? `/api/feeds/${feed.id}/snapshot` : null,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-golden/10 blur-[100px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 text-xs px-4 py-1.5 border-primary/30 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            基于数字地球的摄影选景平台
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
            <span className="block text-foreground">Find the</span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-golden bg-clip-text text-transparent">
              Perfect Light
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            在数字地球上探索中国最美拍摄地，模拟机位预览成片效果，
            <br className="hidden sm:block" />
            让每一次快门都不辜负好光线。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/scout"
              className={cn(buttonVariants({ size: 'lg' }), 'glow-indigo px-8')}
            >
              <Globe className="w-5 h-5 mr-2" />
              开始选景
            </Link>
            <Link
              href="/discover"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-8')}
            >
              <MapPin className="w-5 h-5 mr-2" />
              探索发现
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Locations */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold">精选拍摄地</h2>
              <p className="text-muted-foreground mt-2">中国最具摄影价值的目的地</p>
            </div>
            <Link href="/discover" className="hidden sm:flex items-center text-sm text-primary hover:text-primary/80 transition-colors">
              查看全部 <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((loc) => (
              <Link key={loc.id} href={`/location/${loc.id}`}>
                <Card className="group overflow-hidden border-border/30 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={loc.heroImage}
                      alt={loc.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground">{loc.nameEn}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {loc.province}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {loc.sceneryTags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-2 py-0"
                          style={{ borderColor: sceneryTypes[tag]?.color + '40', color: sceneryTypes[tag]?.color }}
                        >
                          {sceneryTypes[tag]?.icon} {sceneryTypes[tag]?.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Feeds */}
      {publishedFeeds.length > 0 && (
        <section className="py-20 px-4 bg-cinematic/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                  <span className="text-xs uppercase tracking-wider text-red-500 font-semibold">LIVE</span>
                </div>
                <h2 className="text-3xl font-bold">实时风景</h2>
                <p className="text-muted-foreground mt-2">来自各地的高清摄像头直播画面</p>
              </div>
              <Link href="/feeds/live" className="hidden sm:flex items-center text-sm text-primary hover:text-primary/80 transition-colors">
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedFeeds.map((feed) => (
                <Link
                  key={feed.id}
                  href={`/feeds/${feed.id}`}
                  className="group block"
                >
                  <Card className="overflow-hidden border-border/30 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
                    <div className="relative aspect-video overflow-hidden bg-muted/20">
                      {feed.thumbnailUrl || feed.snapshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={feed.thumbnailUrl || feed.snapshotUrl || ''}
                          alt={feed.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      {feed.isLive && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-red-500/90 text-white text-xs font-medium rounded">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-white text-[10px] uppercase rounded">
                        {feed.streamType}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        {feed.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {feed.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/feeds/live"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-8')}
              >
                查看全部直播 <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Product Pitch - 3 columns */}
      <section className="py-20 px-4 bg-cinematic/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">从选景到成片，一站搞定</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
            数字地球预演 → 实地精准拍摄 → 相框永久珍藏
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">数字地球选景</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                3D 地球上浏览拍摄地，模拟不同时间与机位的拍摄效果，提前规划你的摄影之旅。
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-golden/10 flex items-center justify-center mb-6 group-hover:bg-golden/20 group-hover:scale-110 transition-all">
                <Camera className="w-8 h-8 text-golden" />
              </div>
              <h3 className="text-xl font-semibold mb-3">LBS 引导拍摄</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                精准导航到最佳机位，实时天气与光线条件提醒，让每次拍摄都恰到好处。
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-card border border-border/30 flex items-center justify-center mb-6 group-hover:bg-accent/50 group-hover:scale-110 transition-all">
                <Tv className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">电子相框珍藏</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                拍摄的精美照片实时推送到家居电子相框，成为时尚家居装饰，定格最美瞬间。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">定制你的专属景色</h2>
          <p className="text-muted-foreground mb-8">
            订阅星空、云海、落日…当最佳拍摄条件出现时，第一时间收到通知。
          </p>
          <Link
            href="/subscribe"
            className={cn(buttonVariants({ size: 'lg' }), 'glow-indigo px-8')}
          >
            开始定制 <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-xs text-muted-foreground">
          © 2026 QuasarFrame. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
