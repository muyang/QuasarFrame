ALTER TABLE `frame_orders` ADD `client_request_id` text;--> statement-breakpoint
ALTER TABLE `frame_orders` ADD `request_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `frame_orders_user_request_unique` ON `frame_orders` (`user_id`,`client_request_id`);