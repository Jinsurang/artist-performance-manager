CREATE TABLE `notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `artists` ADD `grade` varchar(50);--> statement-breakpoint
ALTER TABLE `artists` ADD `availableTime` varchar(255);--> statement-breakpoint
ALTER TABLE `artists` ADD `instruments` varchar(255);