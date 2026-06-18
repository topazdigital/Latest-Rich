-- ============================================================
--  Rich Dating Network — email_campaigns migration
--  Run on your production MySQL/MariaDB server.
--  Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================

-- Step 1: Create the table fresh if it does not exist at all
CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id`               INT(11)       NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(500)  NOT NULL DEFAULT '',
  `subject`          VARCHAR(500)  NOT NULL DEFAULT '',
  `html_body`        LONGTEXT      NOT NULL DEFAULT '',
  `status`           VARCHAR(50)   DEFAULT 'draft',
  `total_recipients` INT(11)       DEFAULT 0,
  `sent_count`       INT(11)       DEFAULT 0,
  `failed_count`     INT(11)       DEFAULT 0,
  `batch_size`       INT(11)       DEFAULT 50,
  `cooling_seconds`  INT(11)       DEFAULT 60,
  `filter_gender`    INT(11)       DEFAULT 0,
  `filter_country`   VARCHAR(10)   DEFAULT '',
  `filter_min_age`   INT(11)       DEFAULT 0,
  `filter_max_age`   INT(11)       DEFAULT 0,
  `only_real`        INT(11)       DEFAULT 1,
  `created_by`       INT(11)       DEFAULT 0,
  `created_at`       INT(11)       DEFAULT 0,
  `started_at`       INT(11)       DEFAULT 0,
  `completed_at`     INT(11)       DEFAULT 0,
  `last_sent_at`     INT(11)       DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 2: Add NEW columns that the old PHP table is missing.
--         MariaDB 10.0+ / MySQL 8.0.3+ support IF NOT EXISTS on ALTER.
--         These are all the columns the Node.js app expects that the
--         old PHP schema didn't have.

ALTER TABLE `email_campaigns`
  ADD COLUMN IF NOT EXISTS `name`             VARCHAR(500)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `html_body`        LONGTEXT      NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `sent_count`       INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `failed_count`     INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `cooling_seconds`  INT(11)       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS `filter_gender`    INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `filter_country`   VARCHAR(10)   DEFAULT '',
  ADD COLUMN IF NOT EXISTS `filter_min_age`   INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `filter_max_age`   INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `only_real`        INT(11)       DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `started_at`       INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `completed_at`     INT(11)       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `last_sent_at`     INT(11)       DEFAULT 0;

-- Step 3: Widen subject if it is still VARCHAR(255) from the old schema
ALTER TABLE `email_campaigns`
  MODIFY COLUMN `subject` VARCHAR(500) NOT NULL DEFAULT '';

-- Step 4: Fix legacy PHP columns that are NOT NULL with no default.
--         The new app does not write to these columns, so give them safe defaults
--         so MySQL stops complaining on every INSERT.
ALTER TABLE `email_campaigns`
  MODIFY COLUMN IF EXISTS `message`     TEXT         NOT NULL DEFAULT '',
  MODIFY COLUMN IF EXISTS `body`        TEXT         NOT NULL DEFAULT '',
  MODIFY COLUMN IF EXISTS `title`       VARCHAR(500) NOT NULL DEFAULT '',
  MODIFY COLUMN IF EXISTS `recipients`  TEXT         NOT NULL DEFAULT '',
  MODIFY COLUMN IF EXISTS `type`        VARCHAR(100) NOT NULL DEFAULT '',
  MODIFY COLUMN IF EXISTS `content`     LONGTEXT     NOT NULL DEFAULT '';

-- Step 5: Create email_campaign_logs table (per-email delivery tracking)
CREATE TABLE IF NOT EXISTS `email_campaign_logs` (
  `id`           BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id`  INT(11)             NOT NULL,
  `email`        VARCHAR(500)        NOT NULL DEFAULT '',
  `status`       VARCHAR(20)                  DEFAULT 'ok',
  `error`        TEXT                         DEFAULT '',
  `sent_at`      INT(11)                      DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_status`      (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Verify
SELECT CONCAT(
  'email_campaigns is ready with ', COUNT(*), ' columns.'
) AS result
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'email_campaigns';

SELECT CONCAT(
  'email_campaign_logs table exists: ', COUNT(*), ' columns.'
) AS result
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'email_campaign_logs';
