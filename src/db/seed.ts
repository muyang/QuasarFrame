import { db } from './index';
import { users, membershipPlans, cameraFeeds, frameSkus, frameContentBundles } from './schema';
import { hash } from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';

async function seed() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== '1') {
    throw new Error('Demo seed is for isolated local development only. Set ALLOW_DEMO_SEED=1 outside production.');
  }
  console.log('🌱 Seeding database...');

  // Create membership plans
  const plans = [
    {
      id: 'free',
      name: '免费版',
      nameEn: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      maxDownloadsPerMonth: 0,
      featuresJson: JSON.stringify(['浏览免费内容', '3次/天相框推送']),
    },
    {
      id: 'photo',
      name: '摄影版',
      nameEn: 'Photographer',
      priceMonthly: 29,
      priceYearly: 290,
      maxDownloadsPerMonth: 50,
      featuresJson: JSON.stringify(['50次下载/月', '全部摄像头', '无限相框推送', '优先客服']),
    },
    {
      id: 'pro',
      name: '专业版',
      nameEn: 'Professional',
      priceMonthly: 99,
      priceYearly: 990,
      maxDownloadsPerMonth: -1,
      featuresJson: JSON.stringify(['无限下载', '优先摄像头', 'API访问', '专属客服', '商业授权']),
    },
  ];

  for (const plan of plans) {
    await db.insert(membershipPlans).values(plan).onConflictDoNothing();
  }
  console.log('  ✅ Membership plans');

  // Create demo admin
  const adminPassword = await hash('admin123', 12);
  await db.insert(users).values({
    id: uuid(),
    email: 'admin@quasarframe.com',
    passwordHash: adminPassword,
    name: '管理员',
    role: 'admin',
    membership: 'pro',
    bio: 'QuasarFrame 平台管理员',
  }).onConflictDoNothing();
  console.log('  ✅ Admin user (admin@quasarframe.com / admin123)');

  // Create demo photographer
  const photoPassword = await hash('photo123', 12);
  const photographerId = uuid();
  await db.insert(users).values({
    id: photographerId,
    email: 'photographer@example.com',
    passwordHash: photoPassword,
    name: '张摄影',
    role: 'user',
    isCreator: true,
    membership: 'photo',
    bio: '风光摄影师，专注星空与云海',
  }).onConflictDoNothing();
  console.log('  ✅ Photographer (photographer@example.com / photo123)');

  // Resolve the actual photographer id (onConflictDoNothing may have kept an
  // existing row with a different uuid, which would break FK on cameraFeeds).
  const [existingPhotographer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'photographer@example.com'))
    .limit(1);
  const photographerRowId = existingPhotographer?.id ?? photographerId;

  // Create test user (regular member)
  const testPassword = await hash('test123', 12);
  const testUserId = uuid();
  await db.insert(users).values({
    id: testUserId,
    email: 'test@example.com',
    passwordHash: testPassword,
    name: '测试用户',
    role: 'user',
    isCreator: false,
    membership: 'free',
    bio: '测试账户',
  }).onConflictDoNothing();
  console.log('  ✅ Test user (test@example.com / test123)');

  // Create demo camera feeds
  const feeds = [
    {
      id: 'demo-feed-niubei',
      name: '牛背山画面演示',
      locationId: 'niubei',
      type: 'official' as const,
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      snapshotUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      streamType: 'hls' as const,
      isLive: false,
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80',
      description: '演示视频，不代表牛背山实时画面',
      status: 'active' as const,
    },
    {
      id: 'demo-feed-chaka',
      name: '茶卡盐湖画面演示',
      locationId: 'chaka',
      type: 'official' as const,
      snapshotUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      streamType: 'image' as const,
      isLive: false,
      thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      description: '演示图片，不代表茶卡盐湖实时画面',
      status: 'active' as const,
    },
    {
      id: 'demo-feed-namtso',
      name: '纳木错画面演示',
      locationId: 'namtso',
      type: 'third_party' as const,
      userId: photographerRowId,
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      snapshotUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80',
      streamType: 'hls' as const,
      isLive: false,
      thumbnailUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80',
      description: '演示视频，不代表纳木错实时画面',
      status: 'active' as const,
    },
  ];

  for (const feed of feeds) {
    await db.insert(cameraFeeds).values(feed).onConflictDoNothing();
  }
  console.log(`  ✅ Camera feeds (${feeds.length} feeds)`);

  // Frame SKUs — three sizes, two bezel options on the middle one.
  const skus = [
    {
      id: 'sku-frame-7-black',
      model: 'QuasarFrame Aurora 7',
      screenInch: 7,
      bezelColor: '曜石黑',
      price: 899,
      stock: 200,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1545239351-1141bd82b446?w=600&q=80',
      ]),
      specs: JSON.stringify({
        resolution: '1280×800',
        panel: 'IPS',
        ratio: '4:3',
        weight: '0.6kg',
      }),
      status: 'active' as const,
    },
    {
      id: 'sku-frame-10-black',
      model: 'QuasarFrame Aurora 10',
      screenInch: 10.1,
      bezelColor: '曜石黑',
      price: 1499,
      stock: 120,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1545239351-1141bd82b446?w=600&q=80',
      ]),
      specs: JSON.stringify({
        resolution: '1920×1200',
        panel: 'IPS',
        ratio: '16:10',
        weight: '0.9kg',
      }),
      status: 'active' as const,
    },
    {
      id: 'sku-frame-10-white',
      model: 'QuasarFrame Aurora 10',
      screenInch: 10.1,
      bezelColor: '画廊白',
      price: 1499,
      stock: 80,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1513519475013-f8f8a3f7f7b1?w=600&q=80',
      ]),
      specs: JSON.stringify({
        resolution: '1920×1200',
        panel: 'IPS',
        ratio: '16:10',
        weight: '0.9kg',
      }),
      status: 'active' as const,
    },
    {
      id: 'sku-frame-15-black',
      model: 'QuasarFrame Aurora 15',
      screenInch: 15.6,
      bezelColor: '曜石黑',
      price: 2699,
      stock: 40,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1545239351-1141bd82b446?w=600&q=80',
      ]),
      specs: JSON.stringify({
        resolution: '3840×2160',
        panel: 'OLED',
        ratio: '16:9',
        weight: '1.4kg',
      }),
      status: 'active' as const,
    },
  ];

  for (const sku of skus) {
    await db.insert(frameSkus).values(sku).onConflictDoNothing();
  }
  console.log(`  ✅ Frame SKUs (${skus.length} models)`);

  // Content bundles — no photoIds yet (seed.ts does not seed photos);
  // royalty still resolves to "no contributors" when the bundle has no photoIds.
  const bundles = [
    {
      id: 'bundle-stargazing-default',
      skuId: 'sku-frame-10-black',
      name: '星空精选集',
      description: '银河、星轨、流星雨 — 来自全国各地夜景摄影精选',
      photoIds: JSON.stringify([]),
      royaltyRule: JSON.stringify({ type: 'percent', value: 0.5 }),
      price: 0,
      status: 'active' as const,
    },
    {
      id: 'bundle-cloud-sea',
      skuId: null,
      name: '云海日出',
      description: '牛背山、贡嘎、峨眉 — 高山云海日出延时合集',
      photoIds: JSON.stringify([]),
      royaltyRule: JSON.stringify({ type: 'percent', value: 0.4 }),
      price: 49,
      status: 'active' as const,
    },
  ];

  for (const bundle of bundles) {
    await db.insert(frameContentBundles).values(bundle).onConflictDoNothing();
  }
  console.log(`  ✅ Frame content bundles (${bundles.length} bundles)`);

  console.log('🌱 Seed complete!');
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
