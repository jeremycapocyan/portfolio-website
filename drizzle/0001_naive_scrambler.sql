CREATE TABLE `time_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	CONSTRAINT "time_block_duration" CHECK("time_blocks"."end_at" > "time_blocks"."start_at")
);
--> statement-breakpoint
CREATE INDEX `time_blocks_start` ON `time_blocks` (`start_at`);