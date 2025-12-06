CREATE TABLE `qrCodes` (
	`id` text PRIMARY KEY NOT NULL,
	`fileKey` text NOT NULL,
	`encodeText` text NOT NULL,
	`createdAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qrCodes_fileKey_unique` ON `qrCodes` (`fileKey`);