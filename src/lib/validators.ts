import { z } from 'zod';

// ─── Auth ───
export const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8位').max(64),
  name: z.string().min(2, '姓名至少2个字符').max(50),
  phone: z.string().optional(),
  wechatId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ─── Photos ───
export const photoUploadSchema = z.object({
  title: z.string().min(1, '请输入标题').max(200),
  description: z.string().max(2000).optional(),
  locationId: z.string().optional(),
  coordinatesLng: z.number().min(-180).max(180).optional(),
  coordinatesLat: z.number().min(-90).max(90).optional(),
  shotAt: z.string().optional(),
  weather: z.string().max(100).optional(),
  cameraMake: z.string().max(100).optional(),
  cameraModel: z.string().max(100).optional(),
  lens: z.string().max(200).optional(),
  aperture: z.string().max(20).optional(),
  shutterSpeed: z.string().max(20).optional(),
  iso: z.number().int().min(0).max(1000000).optional(),
  focalLength: z.number().int().min(1).max(2000).optional(),
  azimuth: z.number().min(0).max(360).optional(),
  elevation: z.number().min(-90).max(90).optional(),
  gpsAccuracy: z.number().min(0).optional(),
  priceType: z.enum(['free', 'paid']).default('free'),
  price: z.number().min(0).max(10000).default(0),
});

export const photoUpdateSchema = photoUploadSchema.partial();

// ─── Camera Feeds ───
export const feedCreateSchema = z.object({
  name: z.string().min(1).max(200),
  locationId: z.string().optional(),
  streamUrl: z.string().url().optional(),
  snapshotUrl: z.string().url().optional(),
  streamType: z.enum(['hls', 'rtmp', 'flv', 'image', 'mjpeg']).default('image'),
  authHeader: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum(['official', 'third_party']).default('third_party'),
});

export const feedUpdateSchema = feedCreateSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

// ─── Routes (vacation routes) ───
export const routeStopSchema = z.object({
  orderIndex: z.number().int().min(0),
  locationId: z.string().optional(),
  photoId: z.string().optional(),
  note: z.string().max(500).optional(),
  transportHint: z.string().max(200).optional(),
  bestTimeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night']).optional(),
  staySuggestion: z.string().max(200).optional(),
});

export const routeCreateSchema = z.object({
  title: z.string().min(2, '标题至少2个字符').max(120),
  description: z.string().max(2000).optional(),
  days: z.number().int().min(1).max(60).optional(),
  bestSeason: z.string().max(50).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  stops: z.array(routeStopSchema).max(30).default([]),
});

export const routeUpdateSchema = routeCreateSchema.partial();

// ─── Purchases ───
export const purchaseSchema = z.object({
  resourceType: z.enum(['photo', 'feed']),
  resourceId: z.string(),
  paymentMethod: z.enum(['balance', 'wechat', 'alipay', 'mock']).default('mock'),
});

// ─── Subscriptions ───
export const subscriptionSchema = z.object({
  planId: z.string(),
  autoRenew: z.boolean().default(false),
});

// ─── Frame (physical product + content bundles) ───
export const frameSkuCreateSchema = z.object({
  model: z.string().min(1, '请输入型号').max(120),
  screenInch: z.number().min(1).max(120),
  bezelColor: z.string().min(1).max(60),
  price: z.number().min(0).max(1000000),
  stock: z.number().int().min(0).max(100000).default(0),
  images: z.array(z.string().url()).max(10).optional(),
  specs: z.record(z.string(), z.string()).optional(),
  status: z.enum(['active', 'discontinued']).default('active'),
});

export const frameSkuUpdateSchema = frameSkuCreateSchema.partial();

export const frameBundleCreateSchema = z.object({
  skuId: z.string().optional(),
  name: z.string().min(1, '请输入名称').max(200),
  description: z.string().max(2000).optional(),
  photoIds: z.array(z.string().min(1)).min(1, '至少包含 1 张照片').max(200),
  royaltyRule: z.object({
    type: z.enum(['percent', 'fixed']).default('percent'),
    value: z.number().min(0).max(1).default(0.5),
  }).default({ type: 'percent', value: 0.5 }),
  price: z.number().min(0).max(1000000).default(0),
  status: z.enum(['active', 'retired']).default('active'),
});

export const frameBundleUpdateSchema = frameBundleCreateSchema.partial();

export const frameOrderItemSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  bundleId: z.string().optional(),
});

export const frameOrderCreateSchema = z.object({
  items: z.array(frameOrderItemSchema).min(1, '至少选择 1 件商品').max(50),
  shippingAddress: z.object({
    name: z.string().min(1, '请填写收件人').max(60),
    phone: z.string().min(6, '请填写联系电话').max(30),
    province: z.string().min(1).max(40),
    city: z.string().min(1).max(40),
    district: z.string().min(1).max(40),
    detail: z.string().min(1, '请填写详细地址').max(300),
    zip: z.string().max(20).optional(),
  }),
  paymentMethod: z.enum(['balance', 'wechat', 'alipay', 'mock']).default('mock'),
});

export const frameOrderStatusSchema = z.enum(['pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled']);

export const frameOrderUpdateSchema = z.object({
  status: frameOrderStatusSchema.optional(),
  trackingNo: z.string().max(120).optional(),
  paymentMethod: z.enum(['balance', 'wechat', 'alipay', 'mock']).optional(),
});

export const ROYALTY_DEFAULT_PERCENT = 0.5;

// ─── User Profile ───
export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  wechatId: z.string().optional(),
});

// ─── Admin ───
export const reviewSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  rejectReason: z.string().max(500).optional(),
});

// ─── File Upload ───
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG、PNG、WebP 格式' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '文件大小不能超过 20MB' };
  }
  return { valid: true };
}
