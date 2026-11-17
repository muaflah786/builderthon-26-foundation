CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`situation` text NOT NULL,
	`template_id` text,
	`config` text NOT NULL,
	`status` text DEFAULT 'live' NOT NULL,
	`starts_at` integer,
	`join_token` text NOT NULL,
	`join_enabled` integer DEFAULT true NOT NULL,
	`closed_at` integer,
	`closed_by_member_id` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operations_join_token_unique` ON `operations` (`join_token`);--> statement-breakpoint
CREATE TABLE `ops_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`actor_member_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ops_activity_op_created_idx` ON `ops_activity` (`operation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ops_activity_op_entity_idx` ON `ops_activity` (`operation_id`,`entity_id`);--> statement-breakpoint
CREATE TABLE `ops_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`reported_by_member_id` text,
	`team_id` text,
	`location_id` text,
	`title` text NOT NULL,
	`details` text,
	`category` text,
	`severity` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`acknowledged_by_member_id` text,
	`acknowledged_at` integer,
	`resolved_by_member_id` text,
	`resolved_at` integer,
	`resolution_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reported_by_member_id`) REFERENCES `ops_members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`team_id`) REFERENCES `ops_teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `ops_locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ops_issues_op_status_idx` ON `ops_issues` (`operation_id`,`status`);--> statement-breakpoint
CREATE TABLE `ops_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`name` text NOT NULL,
	`directions` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ops_locations_op_idx` ON `ops_locations` (`operation_id`);--> statement-breakpoint
CREATE TABLE `ops_members` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`level` text DEFAULT 'member' NOT NULL,
	`team_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `ops_teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ops_members_op_user_idx` ON `ops_members` (`operation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ops_members_user_idx` ON `ops_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `ops_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`team_id` text,
	`location_id` text,
	`title` text NOT NULL,
	`instructions` text,
	`category` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`assignee_member_id` text,
	`due_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`completion_note` text,
	`completed_by_member_id` text,
	`created_by_member_id` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`verified_at` integer,
	`verified_by_member_id` text,
	`blocked_reason` text,
	`blocked_at` integer,
	`cancelled_reason` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `ops_teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `ops_locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_member_id`) REFERENCES `ops_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ops_tasks_op_status_idx` ON `ops_tasks` (`operation_id`,`status`);--> statement-breakpoint
CREATE INDEX `ops_tasks_op_team_idx` ON `ops_tasks` (`operation_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `ops_tasks_op_assignee_idx` ON `ops_tasks` (`operation_id`,`assignee_member_id`);--> statement-breakpoint
CREATE TABLE `ops_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`name` text NOT NULL,
	`purpose` text,
	`location_id` text,
	`archived_at` integer,
	`archived_by_member_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `ops_locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ops_teams_op_idx` ON `ops_teams` (`operation_id`);