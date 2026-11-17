CREATE TABLE `ops_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`member_id` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`accuracy` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `ops_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ops_positions_member_idx` ON `ops_positions` (`member_id`);--> statement-breakpoint
CREATE INDEX `ops_positions_op_idx` ON `ops_positions` (`operation_id`);