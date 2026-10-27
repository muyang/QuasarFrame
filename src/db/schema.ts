import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ───
// Single-role model: 'user' | 'admin'. Creator status is a capability flag
// (isCreator), auto-flipped when a user's first photo is approved or first
// route is published. Membership tier remains on `membership`.
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull().default('user'),
  isCreator: integer('is_creator', { mode: 'boolean' }).notNull().default(false),
  membership: text('membership', { enum: ['free', 'photo', 'pro'] })
    .notNull().default('free'),
  balance: real('balance').notNull().default(0),
  bio: text('bio'),
  phone: text('phone'),
  wechatId: text('wechat_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Photography planning ───
// Catalogue places are broad, illustrative entries. Precise geometry lives in
// owner-scoped points and is never promoted to verified by a user submission.
export const places = sqliteTable('places', {
  id: text('id').primaryKey(),
  catalogueId: text('catalogue_id').notNull().unique(),
  name: text('name').notNull(),
  province: text('province').notNull(),
  status: text('status', { enum: ['illustrative'] }).notNull().default('illustrative'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const vantagePoints = sqliteTable('vantage_points', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  placeId: text('place_id').notNull().references(() => places.id),
  name: text('name').notNull(),
  longitude: real('longitude').notNull(),
  latitude: real('latitude').notNull(),
  coordinateSystem: text('coordinate_system').notNull().default('WGS84-assumed'),
  source: text('source', { enum: ['catalogue_estimate', 'user_input', 'gps', 'legacy_import'] }).notNull(),
  horizontalAccuracyM: real('horizontal_accuracy_m'),
  elevationM: real('elevation_m'),
  verticalDatum: text('vertical_datum', { enum: ['unknown', 'WGS84_ellipsoid', 'EGM96', 'EGM2008'] }).notNull().default('unknown'),
  cameraHeightM: real('camera_height_m'),
  verifiedAt: text('verified_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  placeId: text('place_id').notNull().references(() => places.id),
  name: text('name').notNull(),
  longitude: real('longitude').notNull(),
  latitude: real('latitude').notNull(),
  coordinateSystem: text('coordinate_system').notNull().default('WGS84-assumed'),
  source: text('source', { enum: ['user_input', 'gps', 'legacy_import'] }).notNull(),
  horizontalAccuracyM: real('horizontal_accuracy_m'),
  elevationM: real('elevation_m'),
  verticalDatum: text('vertical_datum', { enum: ['unknown', 'WGS84_ellipsoid', 'EGM96', 'EGM2008'] }).notNull().default('unknown'),
  heightAboveGroundM: real('height_above_ground_m'),
  verifiedAt: text('verified_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const shootingPlans = sqliteTable('shooting_plans', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  placeId: text('place_id').notNull().references(() => places.id),
  vantagePointId: text('vantage_point_id').notNull().references(() => vantagePoints.id),
  subjectId: text('subject_id').references(() => subjects.id),
  title: text('title').notNull(),
  version: integer('version').notNull().default(2),
  coordinateSource: text('coordinate_source', { enum: ['catalogue', 'user'] }).notNull().default('user'),
  shotAt: text('shot_at').notNull(),
  timeZone: text('time_zone').notNull(),
  focalLengthMm: real('focal_length_mm').notNull(),
  sensor: text('sensor', { enum: ['fullFrame', 'apsc', 'm43'] }).notNull(),
  portrait: integer('portrait', { mode: 'boolean' }).notNull(),
  azimuth: real('azimuth').notNull(),
  elevation: real('elevation').notNull(),
  travelMinutes: integer('travel_minutes'),
  setupMinutes: integer('setup_minutes').notNull(),
  notes: text('notes').notNull().default(''),
  dataVersion: text('data_version').notNull(),
  workspace: text('workspace', { mode: 'json' }).$type<import('../lib/shooting-workspace').ShootingWorkspace>(),
  legacyFingerprint: text('legacy_fingerprint'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('shooting_plans_owner_legacy_unique').on(table.ownerId, table.legacyFingerprint),
]);

// ─── Photos (user-uploaded works) ───
export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  locationId: text('location_id'),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  coordinatesLng: real('coordinates_lng'),
  coordinatesLat: real('coordinates_lat'),
  shotAt: text('shot_at'),
  weather: text('weather'),
  // Camera EXIF data
  cameraMake: text('camera_make'),
  cameraModel: text('camera_model'),
  lens: text('lens'),
  aperture: text('aperture'),
  shutterSpeed: text('shutter_speed'),
  iso: integer('iso'),
  focalLength: integer('focal_length'),
  sensorFormat: text('sensor_format', { enum: ['unknown', 'fullFrame', 'apsc', 'm43'] }).notNull().default('unknown'),
  // Shooting position
  azimuth: real('azimuth'),
  elevation: real('elevation_deg'),
  gpsAccuracy: real('gps_accuracy'),
  metadataProvenance: text('metadata_provenance').notNull().default('{}'),
  shareCoordinates: integer('share_coordinates', { mode: 'boolean' }).notNull().default(false),
  // Pricing
  priceType: text('price_type', { enum: ['free', 'paid'] }).notNull().default('free'),
  price: real('price').notNull().default(0),
  downloadCount: integer('download_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  // Moderation
  status: text('status', { enum: ['draft', 'pending', 'approved', 'rejected'] })
    .notNull().default('pending'),
  rejectReason: text('reject_reason'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// Private by default. Evidence and candidates retain their source instead of
// replacing a photo's author-entered coordinates with an automated guess.
export const photoEvidenceItems = sqliteTable('photo_evidence_items', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull().references(() => photos.id),
  ownerId: text('owner_id').notNull().references(() => users.id),
  field: text('field').notNull(),
  source: text('source', { enum: ['exif', 'manual', 'visual', 'terrain'] }).notNull(),
  valueJson: text('value_json').notNull(),
  confidence: text('confidence', { enum: ['reported', 'candidate', 'verified'] }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [index('photo_evidence_photo_idx').on(table.photoId)]);

export const photoLocationCandidates = sqliteTable('photo_location_candidates', {
  id: text('id').primaryKey(),
  photoId: text('photo_id').notNull().references(() => photos.id),
  ownerId: text('owner_id').notNull().references(() => users.id),
  longitude: real('longitude').notNull(),
  latitude: real('latitude').notNull(),
  radiusM: real('radius_m'),
  azimuthDeg: real('azimuth_deg'),
  method: text('method', { enum: ['exif', 'manual', 'skyline'] }).notNull(),
  score: real('score'),
  status: text('status', { enum: ['proposed', 'user_confirmed', 'rejected'] }).notNull().default('proposed'),
  evidenceJson: text('evidence_json').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [index('photo_candidate_photo_idx').on(table.photoId)]);

// Curated graph facts require a source; user photos and precise positions are
// never inserted into the public graph by upload or candidate generation.
export const knowledgeNodes = sqliteTable('knowledge_nodes', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  claimType: text('claim_type', { enum: ['fact', 'observation', 'inference', 'recommendation'] }).notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceLicense: text('source_license').notNull(),
  version: integer('version').notNull().default(1),
  status: text('status', { enum: ['draft', 'published', 'withdrawn'] }).notNull().default('draft'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const knowledgeEdges = sqliteTable('knowledge_edges', {
  id: text('id').primaryKey(),
  fromId: text('from_id').notNull().references(() => knowledgeNodes.id),
  toId: text('to_id').notNull().references(() => knowledgeNodes.id),
  relation: text('relation').notNull(),
  claimType: text('claim_type', { enum: ['fact', 'observation', 'inference', 'recommendation'] }).notNull(),
  sourceUrl: text('source_url').notNull(),
  version: integer('version').notNull().default(1),
  status: text('status', { enum: ['draft', 'published', 'withdrawn'] }).notNull().default('draft'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [index('knowledge_edge_from_idx').on(table.fromId), index('knowledge_edge_to_idx').on(table.toId)]);

// A purchase or an approved photo alone does not imply redistribution rights.
// The latest license version must explicitly permit the intended use/screen.
export const sourceLicenses = sqliteTable('source_licenses', {
  id: text('id').primaryKey(),
  resourceType: text('resource_type', { enum: ['photo', 'feed', 'bundle'] }).notNull(),
  resourceId: text('resource_id').notNull(),
  ownerId: text('owner_id').references(() => users.id),
  version: integer('version').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'revoked'] }).notNull().default('pending'),
  scopeJson: text('scope_json').notNull(),
  evidenceUrl: text('evidence_url'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('source_license_version_unique').on(table.resourceType, table.resourceId, table.version),
  index('source_license_resource_idx').on(table.resourceType, table.resourceId),
]);

export const entitlementGrants = sqliteTable('entitlement_grants', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  resourceType: text('resource_type', { enum: ['photo', 'feed', 'bundle'] }).notNull(),
  resourceId: text('resource_id').notNull(),
  purchaseId: text('purchase_id').references(() => purchases.id),
  licenseId: text('license_id').notNull().references(() => sourceLicenses.id),
  channelsJson: text('channels_json').notNull(),
  grantedAt: text('granted_at').notNull().default(sql`(datetime('now'))`),
  revokedAt: text('revoked_at'),
}, (table) => [index('entitlement_user_resource_idx').on(table.userId, table.resourceType, table.resourceId)]);

// ─── Camera Feeds ───
export const cameraFeeds = sqliteTable('camera_feeds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  locationId: text('location_id'),
  userId: text('user_id').references(() => users.id), // null = official
  type: text('type', { enum: ['official', 'third_party'] }).notNull().default('official'),
  streamUrl: text('stream_url'),
  snapshotUrl: text('snapshot_url'),
  streamType: text('stream_type', { enum: ['hls', 'rtmp', 'flv', 'image', 'mjpeg'] })
    .notNull().default('image'),
  authHeader: text('auth_header'),
  isLive: integer('is_live', { mode: 'boolean' }).notNull().default(false),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  status: text('status', { enum: ['active', 'inactive', 'maintenance'] })
    .notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Purchases ───
// Resource type extended to cover future paid resources.
export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  resourceType: text('resource_type', { enum: ['photo', 'feed', 'frame_order', 'bundle', 'ad_campaign'] })
    .notNull(),
  resourceId: text('resource_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('CNY'),
  paymentMethod: text('payment_method', { enum: ['balance', 'wechat', 'alipay', 'mock'] })
    .notNull().default('mock'),
  status: text('status', { enum: ['pending', 'completed', 'refunded'] })
    .notNull().default('completed'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Membership Plans ───
export const membershipPlans = sqliteTable('membership_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en').notNull(),
  priceMonthly: real('price_monthly').notNull(),
  priceYearly: real('price_yearly').notNull(),
  maxDownloadsPerMonth: integer('max_downloads_per_month').notNull().default(0),
  featuresJson: text('features_json'),
});

// ─── User Subscriptions (membership plan billing) ───
export const userSubscriptions = sqliteTable('user_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  planId: text('plan_id').notNull().references(() => membershipPlans.id),
  startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
  expiresAt: text('expires_at').notNull(),
  downloadsUsed: integer('downloads_used').notNull().default(0),
  autoRenew: integer('auto_renew', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['active', 'expired', 'cancelled'] })
    .notNull().default('active'),
});

// ─── Commissions ───
// triggerType identifies which business event generated the royalty.
export const commissions = sqliteTable('commissions', {
  id: text('id').primaryKey(),
  contributorId: text('contributor_id').notNull().references(() => users.id),
  purchaseId: text('purchase_id').notNull().references(() => purchases.id),
  amount: real('amount').notNull(),
  percentage: real('percentage').notNull().default(0.7),
  triggerType: text('trigger_type', {
    enum: ['photo_unlock', 'feed_unlock', 'frame_royalty', 'ad_affiliate'],
  }).notNull().default('photo_unlock'),
  // For frame_royalty: the bundle + photo this royalty came from.
  // For ad_affiliate: the placement + location this click came from.
  refTable: text('ref_table'),
  refId: text('ref_id'),
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Notifications ───
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['purchase', 'commission', 'review', 'system', 'scenery', 'order'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  linkUrl: text('link_url'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Unlocks (which user has unlocked which resource) ───
export const unlocks = sqliteTable('unlocks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  resourceType: text('resource_type', { enum: ['photo', 'feed'] }).notNull(),
  resourceId: text('resource_id').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('unlocks_user_resource_unique').on(table.userId, table.resourceType, table.resourceId),
]);

// ─── Vacation Routes (UGC, free, drives traffic to constituent photos) ───
export const routes = sqliteTable('routes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  days: integer('days'),
  bestSeason: text('best_season'), // comma-separated: spring,summer,...
  difficulty: integer('difficulty').notNull().default(2), // 1-5
  coverImage: text('cover_image'),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .notNull().default('draft'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const routeStops = sqliteTable('route_stops', {
  id: text('id').primaryKey(),
  routeId: text('route_id').notNull().references(() => routes.id),
  orderIndex: integer('order_index').notNull(),
  locationId: text('location_id'),
  photoId: text('photo_id'),
  note: text('note'),
  transportHint: text('transport_hint'),
  bestTimeOfDay: text('best_time_of_day'), // dawn/morning/noon/afternoon/dusk/night
  staySuggestion: text('stay_suggestion'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Electronic Frame (physical product) ───
export const frameSkus = sqliteTable('frame_skus', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  screenInch: real('screen_inch').notNull(),
  bezelColor: text('bezel_color').notNull(),
  price: real('price').notNull(),
  stock: integer('stock').notNull().default(0),
  images: text('images'), // JSON array
  specs: text('specs'), // JSON object
  status: text('status', { enum: ['active', 'discontinued'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const frameOrders = sqliteTable('frame_orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  itemsJson: text('items_json').notNull(), // [{skuId, quantity, amount}]
  totalAmount: real('total_amount').notNull(),
  shippingAddress: text('shipping_address').notNull(), // JSON
  trackingNo: text('tracking_no'),
  status: text('status', {
    enum: ['pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled'],
  }).notNull().default('pending_payment'),
  paymentMethod: text('payment_method', { enum: ['balance', 'wechat', 'alipay', 'mock'] })
    .notNull().default('mock'),
  clientRequestId: text('client_request_id'),
  requestHash: text('request_hash'),
  bundleId: text('bundle_id'), // bundled content package
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('frame_orders_user_request_unique').on(table.userId, table.clientRequestId),
]);

export const frameContentBundles = sqliteTable('frame_content_bundles', {
  id: text('id').primaryKey(),
  skuId: text('sku_id'), // nullable: standalone bundle or attached to a SKU
  name: text('name').notNull(),
  description: text('description'),
  photoIds: text('photo_ids').notNull(), // JSON array
  royaltyRule: text('royalty_rule').notNull().default('{"type":"percent","value":0.5}'),
  price: real('price').notNull().default(0), // 0 when bundled with frame
  status: text('status', { enum: ['active', 'retired'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Advertisements ───
export const advertisers = sqliteTable('advertisers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  status: text('status', { enum: ['active', 'blacklisted'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const adCampaigns = sqliteTable('ad_campaigns', {
  id: text('id').primaryKey(),
  advertiserId: text('advertiser_id').notNull().references(() => advertisers.id),
  name: text('name').notNull(),
  budget: real('budget').notNull().default(0),
  spent: real('spent').notNull().default(0),
  startAt: text('start_at'),
  endAt: text('end_at'),
  status: text('status', { enum: ['draft', 'running', 'paused', 'ended'] })
    .notNull().default('draft'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const adPlacements = sqliteTable('ad_placements', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => adCampaigns.id),
  slot: text('slot', {
    enum: ['homepage_hero', 'discover_banner', 'feed_card', 'location_detail', 'frame_screensaver'],
  }).notNull(),
  creativeType: text('creative_type', { enum: ['image', 'video', 'html'] }).notNull(),
  creativeUrl: text('creative_url').notNull(),
  linkUrl: text('link_url'),
  targeting: text('targeting'), // JSON: { locationIds, sceneryTypes, seasons }
  status: text('status', { enum: ['pending', 'active', 'paused', 'ended'] })
    .notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const adImpressions = sqliteTable('ad_impressions', {
  id: text('id').primaryKey(),
  placementId: text('placement_id').notNull().references(() => adPlacements.id),
  userId: text('user_id'), // nullable for anonymous
  event: text('event', { enum: ['impression', 'click'] }).notNull(),
  at: text('at').notNull().default(sql`(datetime('now'))`),
});

// ─── Scenery Subscriptions (condition-based notifications) ───
export const scenerySubscriptions = sqliteTable('scenery_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  sceneryTypes: text('scenery_types').notNull(), // JSON array
  seasons: text('seasons').notNull(), // JSON array
  locationIds: text('location_ids'), // JSON array, nullable = all
  radius: integer('radius').default(200),
  maxDifficulty: integer('max_difficulty').default(3),
  frequency: text('frequency', { enum: ['instant', 'daily', 'weekly'] }).notNull().default('daily'),
  channel: text('channel', { enum: ['web', 'email', 'wechat'] }).notNull().default('web'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lastEvaluatedAt: text('last_evaluated_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const conditionEvaluations = sqliteTable('condition_evaluations', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull().references(() => scenerySubscriptions.id),
  locationId: text('location_id').notNull(),
  sceneryType: text('scenery_type').notNull(),
  probability: real('probability').notNull(),
  matchedAt: text('matched_at').notNull().default(sql`(datetime('now'))`),
  notified: integer('notified', { mode: 'boolean' }).notNull().default(false),
});
