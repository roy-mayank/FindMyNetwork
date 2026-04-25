CREATE TABLE `company_profile` (
	`company_id` text PRIMARY KEY NOT NULL,
	`website` text,
	`crunchbase_slug` text,
	`employee_count_band` text,
	FOREIGN KEY (`company_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edges_source_target_uq` ON `edges` (`source_id`,`target_id`);--> statement-breakpoint
CREATE TABLE `enrichment_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text,
	`patch_json` text NOT NULL,
	`evidence_urls_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `enrichment_proposals_person_idx` ON `enrichment_proposals` (`person_id`);--> statement-breakpoint
CREATE TABLE `funding_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`stage` text NOT NULL,
	`announced_at` text,
	`amount_usd` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`evidence_urls_json` text DEFAULT '[]' NOT NULL,
	`raw_payload_json` text,
	FOREIGN KEY (`company_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `funding_rounds_company_idx` ON `funding_rounds` (`company_id`);--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `person_profile` (
	`person_id` text PRIMARY KEY NOT NULL,
	`notes` text,
	`last_outreach_at` text,
	`enrichment_status` text DEFAULT 'none' NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
