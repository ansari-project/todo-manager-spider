CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text(200) NOT NULL,
	`description` text(1000),
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_status` ON `todos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `todos` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_due_date` ON `todos` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `todos` (`created_at`);