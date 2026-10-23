CREATE TABLE `entitlement_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`purchase_id` text,
	`license_id` text NOT NULL,
	`granted_at` text DEFAULT (datetime('now')) NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`license_id`) REFERENCES `source_licenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entitlement_user_resource_idx` ON `entitlement_grants` (`user_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `knowledge_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`relation` text NOT NULL,
	`claim_type` text NOT NULL,
	`source_url` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_id`) REFERENCES `knowledge_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `knowledge_edge_from_idx` ON `knowledge_edges` (`from_id`);--> statement-breakpoint
CREATE INDEX `knowledge_edge_to_idx` ON `knowledge_edges` (`to_id`);--> statement-breakpoint
CREATE TABLE `knowledge_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`claim_type` text NOT NULL,
	`source_url` text NOT NULL,
	`source_license` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photo_evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`photo_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`field` text NOT NULL,
	`source` text NOT NULL,
	`value_json` text NOT NULL,
	`confidence` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photo_evidence_photo_idx` ON `photo_evidence_items` (`photo_id`);--> statement-breakpoint
CREATE TABLE `photo_location_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`photo_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`longitude` real NOT NULL,
	`latitude` real NOT NULL,
	`radius_m` real,
	`azimuth_deg` real,
	`method` text NOT NULL,
	`score` real,
	`status` text DEFAULT 'proposed' NOT NULL,
	`evidence_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photo_candidate_photo_idx` ON `photo_location_candidates` (`photo_id`);--> statement-breakpoint
CREATE TABLE `source_licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`owner_id` text,
	`version` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scope_json` text NOT NULL,
	`evidence_url` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_license_version_unique` ON `source_licenses` (`resource_type`,`resource_id`,`version`);--> statement-breakpoint
CREATE INDEX `source_license_resource_idx` ON `source_licenses` (`resource_type`,`resource_id`);