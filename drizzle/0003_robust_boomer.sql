CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`catalogue_id` text NOT NULL,
	`name` text NOT NULL,
	`province` text NOT NULL,
	`status` text DEFAULT 'illustrative' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `places_catalogue_id_unique` ON `places` (`catalogue_id`);--> statement-breakpoint
CREATE TABLE `shooting_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`place_id` text NOT NULL,
	`vantage_point_id` text NOT NULL,
	`subject_id` text,
	`title` text NOT NULL,
	`version` integer DEFAULT 2 NOT NULL,
	`shot_at` text NOT NULL,
	`time_zone` text NOT NULL,
	`focal_length_mm` real NOT NULL,
	`sensor` text NOT NULL,
	`portrait` integer NOT NULL,
	`azimuth` real NOT NULL,
	`elevation` real NOT NULL,
	`travel_minutes` integer,
	`setup_minutes` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`data_version` text NOT NULL,
	`legacy_fingerprint` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vantage_point_id`) REFERENCES `vantage_points`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shooting_plans_owner_legacy_unique` ON `shooting_plans` (`owner_id`,`legacy_fingerprint`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`place_id` text NOT NULL,
	`name` text NOT NULL,
	`longitude` real NOT NULL,
	`latitude` real NOT NULL,
	`coordinate_system` text DEFAULT 'WGS84-assumed' NOT NULL,
	`source` text NOT NULL,
	`horizontal_accuracy_m` real,
	`elevation_m` real,
	`vertical_datum` text DEFAULT 'unknown' NOT NULL,
	`height_above_ground_m` real,
	`verified_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vantage_points` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`place_id` text NOT NULL,
	`name` text NOT NULL,
	`longitude` real NOT NULL,
	`latitude` real NOT NULL,
	`coordinate_system` text DEFAULT 'WGS84-assumed' NOT NULL,
	`source` text NOT NULL,
	`horizontal_accuracy_m` real,
	`elevation_m` real,
	`vertical_datum` text DEFAULT 'unknown' NOT NULL,
	`camera_height_m` real,
	`verified_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
