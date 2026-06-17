-- Run this on your production MySQL server to fix the email_campaigns table.
-- Safe to run even if the table already exists.

CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(500) NOT NULL DEFAULT '',
  `subject` VARCHAR(500) NOT NULL DEFAULT '',
  `html_body` LONGTEXT NOT NULL DEFAULT '',
  `status` VARCHAR(50) DEFAULT 'draft',
  `total_recipients` INT DEFAULT 0,
  `sent_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `batch_size` INT DEFAULT 50,
  `cooling_seconds` INT DEFAULT 60,
  `filter_gender` INT DEFAULT 0,
  `filter_country` VARCHAR(10) DEFAULT '',
  `filter_min_age` INT DEFAULT 0,
  `filter_max_age` INT DEFAULT 0,
  `only_real` INT DEFAULT 1,
  `created_by` INT DEFAULT 0,
  `created_at` INT DEFAULT 0,
  `started_at` INT DEFAULT 0,
  `completed_at` INT DEFAULT 0,
  `last_sent_at` INT DEFAULT 0
);

-- If the table already exists but has old TEXT columns without defaults, run these:
ALTER TABLE `email_campaigns`
  MODIFY COLUMN `name` VARCHAR(500) NOT NULL DEFAULT '',
  MODIFY COLUMN `subject` VARCHAR(500) NOT NULL DEFAULT '',
  MODIFY COLUMN `html_body` LONGTEXT NOT NULL DEFAULT '',
  MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'draft';

SELECT 'email_campaigns table is ready.' AS result;
