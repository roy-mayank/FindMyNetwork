CREATE TABLE `email_drafts` (
  `id` text PRIMARY KEY NOT NULL,
  `person_id` text NOT NULL,
  `draft_type` text NOT NULL,
  `subject` text NOT NULL,
  `body` text NOT NULL,
  `profile_version` text,
  `prompt_context_json` text,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`person_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
