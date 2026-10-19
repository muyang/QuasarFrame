CREATE TABLE `ad_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`advertiser_id` text NOT NULL,
	`name` text NOT NULL,
	`budget` real DEFAULT 0 NOT NULL,
	`spent` real DEFAULT 0 NOT NULL,
	`start_at` text,
	`end_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`advertiser_id`) REFERENCES `advertisers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ad_impressions` (
	`id` text PRIMARY KEY NOT NULL,
	`placement_id` text NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`placement_id`) REFERENCES `ad_placements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ad_placements` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`slot` text NOT NULL,
	`creative_type` text NOT NULL,
	`creative_url` text NOT NULL,
	`link_url` text,
	`targeting` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `advertisers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `camera_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location_id` text,
	`user_id` text,
	`type` text DEFAULT 'official' NOT NULL,
	`stream_url` text,
	`snapshot_url` text,
	`stream_type` text DEFAULT 'image' NOT NULL,
	`auth_header` text,
	`is_live` integer DEFAULT false NOT NULL,
	`thumbnail_url` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` text PRIMARY KEY NOT NULL,
	`contributor_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`amount` real NOT NULL,
	`percentage` real DEFAULT 0.7 NOT NULL,
	`trigger_type` text DEFAULT 'photo_unlock' NOT NULL,
	`ref_table` text,
	`ref_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`contributor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `condition_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`location_id` text NOT NULL,
	`scenery_type` text NOT NULL,
	`probability` real NOT NULL,
	`matched_at` text DEFAULT (datetime('now')) NOT NULL,
	`notified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `scenery_subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `frame_content_bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`sku_id` text,
	`name` text NOT NULL,
	`description` text,
	`photo_ids` text NOT NULL,
	`royalty_rule` text DEFAULT '{"type":"percent","value":0.5}' NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `frame_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`items_json` text NOT NULL,
	`total_amount` real NOT NULL,
	`shipping_address` text NOT NULL,
	`tracking_no` text,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`payment_method` text DEFAULT 'mock' NOT NULL,
	`bundle_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `frame_skus` (
	`id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`screen_inch` real NOT NULL,
	`bezel_color` text NOT NULL,
	`price` real NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`images` text,
	`specs` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `membership_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text NOT NULL,
	`price_monthly` real NOT NULL,
	`price_yearly` real NOT NULL,
	`max_downloads_per_month` integer DEFAULT 0 NOT NULL,
	`features_json` text
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`link_url` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`location_id` text,
	`title` text NOT NULL,
	`description` text,
	`image_url` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`coordinates_lng` real,
	`coordinates_lat` real,
	`shot_at` text,
	`weather` text,
	`camera_make` text,
	`camera_model` text,
	`lens` text,
	`aperture` text,
	`shutter_speed` text,
	`iso` integer,
	`focal_length` integer,
	`azimuth` real,
	`elevation_deg` real,
	`gps_accuracy` real,
	`price_type` text DEFAULT 'free' NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reject_reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`payment_method` text DEFAULT 'mock' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `route_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`location_id` text,
	`photo_id` text,
	`note` text,
	`transport_hint` text,
	`best_time_of_day` text,
	`stay_suggestion` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`days` integer,
	`best_season` text,
	`difficulty` integer DEFAULT 2 NOT NULL,
	`cover_image` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scenery_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scenery_types` text NOT NULL,
	`seasons` text NOT NULL,
	`location_ids` text,
	`radius` integer DEFAULT 200,
	`max_difficulty` integer DEFAULT 3,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`channel` text DEFAULT 'web' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_evaluated_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `unlocks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`started_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	`downloads_used` integer DEFAULT 0 NOT NULL,
	`auto_renew` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `membership_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`role` text DEFAULT 'user' NOT NULL,
	`is_creator` integer DEFAULT false NOT NULL,
	`membership` text DEFAULT 'free' NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`bio` text,
	`phone` text,
	`wechat_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);