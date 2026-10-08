CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` integer,
	`last_attempt_at` integer,
	`sent_at` integer,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outbox_state` ON `email_outbox` (`state`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_payment_id` text NOT NULL,
	`reservation_id` text NOT NULL,
	`quote_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_provider_payment` ON `payments` (`provider`,`provider_payment_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`location` text NOT NULL,
	`players` integer NOT NULL,
	`estimated_total` integer NOT NULL,
	`quoted_total` integer,
	`quote_id` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`payment_id` text,
	`confirmed_at` integer,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reservation_status" CHECK("reservations"."status" IN ('pending_review','awaiting_payment','confirmed','cancelled','expired')),
	CONSTRAINT "players_range" CHECK("reservations"."players" BETWEEN 1 AND 8),
	CONSTRAINT "confirmation_requires_payment" CHECK("reservations"."status" != 'confirmed' OR ("reservations"."payment_id" IS NOT NULL AND "reservations"."confirmed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_reservation_per_slot` ON `reservations` (`slot_id`) WHERE "reservations"."status" IN ('pending_review','awaiting_payment','confirmed');--> statement-breakpoint
CREATE INDEX `reservations_expiry` ON `reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	CONSTRAINT "slot_state" CHECK("slots"."state" IN ('open','blocked')),
	CONSTRAINT "slot_duration" CHECK("slots"."end_at" > "slots"."start_at")
);
--> statement-breakpoint
CREATE INDEX `slots_start` ON `slots` (`start_at`);