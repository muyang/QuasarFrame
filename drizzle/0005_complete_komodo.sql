ALTER TABLE `photos` ADD `sensor_format` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `metadata_provenance` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `share_coordinates` integer DEFAULT false NOT NULL;