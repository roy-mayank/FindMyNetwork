CREATE TABLE `pending_captures` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`source_url` text NOT NULL,
	`page_kind` text DEFAULT 'generic' NOT NULL,
	`suggested_kind` text DEFAULT 'unknown' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pending_captures_status_idx` ON `pending_captures` (`status`);
