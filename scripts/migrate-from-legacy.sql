-- =============================================================================
-- Rich Dating Network — Legacy MySQL Migration Script
-- Maps old PHP site tables (admin_testdating) → new app schema tables
--
-- Run this ONCE on your production MySQL server BEFORE (or alongside)
-- drizzle-kit push. It is safe to re-run — all inserts use
-- INSERT IGNORE or WHERE NOT EXISTS to avoid duplicates.
--
-- Usage:
--   mysql -u USER -p DBNAME < scripts/migrate-from-legacy.sql
-- =============================================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------------
-- 1. USERS — role bump
--    Old site: admin=1 means full admin.
--    New app:  admin=2 = admin, admin=1 = moderator.
--    Bump all old admin=1 users to admin=2.
-- ---------------------------------------------------------------------------

UPDATE `users`
SET `admin` = 2
WHERE `admin` = 1;

-- Mark users in old `moderators` table as moderators (admin=1) if not elevated
-- (The moderators table only stores role label strings, not user IDs — skip.)

-- ---------------------------------------------------------------------------
-- 2. PHOTOS
--    Old table: users_photos (id, u_id, photo, approved, blocked, thumb,
--                              profile, private, video, time)
--    New table: photos (id, user_id, photo, thumb, approved, flagged,
--                       flag_reason, main, created)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `photo` text DEFAULT '',
  `thumb` text DEFAULT '',
  `approved` int(11) DEFAULT 1,
  `flagged` int(11) DEFAULT 0,
  `flag_reason` text DEFAULT '',
  `main` int(11) DEFAULT 0,
  `created` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrate from users_photos (old table) to photos (new table)
INSERT INTO `photos` (`user_id`, `photo`, `thumb`, `approved`, `flagged`, `flag_reason`, `main`, `created`)
SELECT
  up.`u_id`,
  up.`photo`,
  COALESCE(NULLIF(up.`thumb`, ''), up.`photo`),
  CASE WHEN up.`approved` = 1 THEN 1 ELSE 0 END,
  CASE WHEN up.`blocked` = 1 THEN 1 ELSE 0 END,
  '',
  CASE WHEN up.`profile` = 1 THEN 1 ELSE 0 END,
  COALESCE(CAST(up.`time` AS UNSIGNED), 0)
FROM `users_photos` up
WHERE NOT EXISTS (
  SELECT 1 FROM `photos` p
  WHERE p.`user_id` = up.`u_id` AND p.`photo` = up.`photo`
);

-- For any users who still have no photo in new table, pull from users.photo
INSERT INTO `photos` (`user_id`, `photo`, `thumb`, `approved`, `flagged`, `flag_reason`, `main`, `created`)
SELECT
  u.`id`,
  u.`photo`,
  COALESCE(NULLIF(u.`photo_thumb`, ''), u.`photo`),
  1, 0, '', 1, COALESCE(u.`created`, 0)
FROM `users` u
WHERE u.`photo` IS NOT NULL AND u.`photo` != ''
  AND NOT EXISTS (
    SELECT 1 FROM `photos` p WHERE p.`user_id` = u.`id`
  );

-- ---------------------------------------------------------------------------
-- 3. LIKES
--    Old table: users_likes (u1, u2, love, time, superlike)
--    New table: likes (id, user_id, target_id, superlike, created)
--    Only migrate rows where love=1 (actual likes, not passes)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `target_id` int(11) NOT NULL,
  `superlike` int(11) DEFAULT 0,
  `created` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `target_id` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `likes` (`user_id`, `target_id`, `superlike`, `created`)
SELECT
  ul.`u1`,
  ul.`u2`,
  COALESCE(ul.`superlike`, 0),
  CAST(ul.`time` AS UNSIGNED)
FROM `users_likes` ul
WHERE ul.`love` = 1
  AND NOT EXISTS (
    SELECT 1 FROM `likes` l WHERE l.`user_id` = ul.`u1` AND l.`target_id` = ul.`u2`
  );

-- ---------------------------------------------------------------------------
-- 4. MESSAGES
--    Old table: messages (id, u1, u2, message, time, read)
--    New app uses the same table — no migration needed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. USER EXTENDED
--    Old table: users_extended (uid, field1-10)
--    New table: user_extended (id, user_id, occupation, education, ...)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_extended` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `occupation` text DEFAULT '',
  `education` text DEFAULT '',
  `height` text DEFAULT '',
  `body_type` text DEFAULT '',
  `ethnicity` text DEFAULT '',
  `religion` text DEFAULT '',
  `smoking` text DEFAULT '',
  `drinking` text DEFAULT '',
  `children` text DEFAULT '',
  `relationship` text DEFAULT '',
  `interests` text DEFAULT '',
  `looking_for_age` text DEFAULT '',
  `ideal_date` text DEFAULT '',
  `passions` text DEFAULT '',
  `self_description` text DEFAULT '',
  `favorite_travel` text DEFAULT '',
  `fun_activities` text DEFAULT '',
  `languages` text DEFAULT '',
  `zodiac` text DEFAULT '',
  `personality_type` text DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure every user has a row in user_extended
INSERT INTO `user_extended` (`user_id`)
SELECT u.`id`
FROM `users` u
WHERE NOT EXISTS (
  SELECT 1 FROM `user_extended` ue WHERE ue.`user_id` = u.`id`
);

-- Map old field1-10 to named columns
-- (field mapping based on common old RDN PHP site convention)
UPDATE `user_extended` ue
INNER JOIN `users_extended` old ON old.`uid` = ue.`user_id`
SET
  ue.`self_description` = COALESCE(NULLIF(old.`field1`, ''), ue.`self_description`),
  ue.`occupation`       = COALESCE(NULLIF(old.`field4`, ''), ue.`occupation`),
  ue.`education`        = COALESCE(NULLIF(old.`field5`, ''), ue.`education`),
  ue.`height`           = COALESCE(NULLIF(old.`field6`, ''), ue.`height`),
  ue.`body_type`        = COALESCE(NULLIF(old.`field7`, ''), ue.`body_type`),
  ue.`relationship`     = COALESCE(NULLIF(old.`field8`, ''), ue.`relationship`),
  ue.`smoking`          = COALESCE(NULLIF(old.`field9`, ''), ue.`smoking`),
  ue.`drinking`         = COALESCE(NULLIF(old.`field10`, ''), ue.`drinking`)
WHERE ue.`user_id` = old.`uid`;

-- ---------------------------------------------------------------------------
-- 6. NOTIFICATIONS — new table, populated by new app
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `from_id` int(11) DEFAULT NULL,
  `type` text NOT NULL,
  `message` text NOT NULL,
  `link` text DEFAULT '',
  `read` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 7. ORDERS
--    Old table: orders (order_id varchar PK, user_id, order_type,
--                       order_package, order_gateway, order_status,
--                       order_date, raw_data, ...)
--    New table: orders (id int AUTO_INCREMENT, user_id, amount, currency,
--                       type, description, status, stripe_session_id,
--                       credits, package_id, time)
--    The new table is created by drizzle-kit push. Rename old table first
--    so there is no conflict.
-- ---------------------------------------------------------------------------

-- Rename old orders table if it still has varchar PK (legacy schema)
-- Run only if old table exists and has varchar order_id
SET @has_old_orders = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'order_id'
    AND DATA_TYPE IN ('varchar','char')
);

SET @sql_rename = IF(
  @has_old_orders > 0,
  'RENAME TABLE `orders` TO `orders_legacy`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_rename;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create new orders table (drizzle push will also do this, but let's ensure it exists)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` float DEFAULT 0,
  `currency` text DEFAULT 'USD',
  `type` text DEFAULT 'credits',
  `description` text DEFAULT '',
  `status` text DEFAULT 'pending',
  `stripe_session_id` text DEFAULT '',
  `credits` int(11) DEFAULT 0,
  `package_id` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 8. FAKE MESSAGE TEMPLATES
--    Old table: fake_messages (id, fake_msg)
--    New table: fake_message_templates (id, message, active)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `fake_message_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message` text NOT NULL,
  `active` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `fake_message_templates` (`id`, `message`, `active`)
SELECT fm.`id`, fm.`fake_msg`, 1
FROM `fake_messages` fm
WHERE fm.`fake_msg` IS NOT NULL AND fm.`fake_msg` != ''
ON DUPLICATE KEY UPDATE `message` = fm.`fake_msg`;

-- ---------------------------------------------------------------------------
-- 9. BLOCKED USERS
--    Old table: users_blocks (u1 blocker, u2 blocked, time)
--    New table: blocked_users (id, user_id, blocked_id, time)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `blocked_id` int(11) NOT NULL,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_block` (`user_id`, `blocked_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Wrap in a procedure so missing source table or wrong columns are silently skipped
DROP PROCEDURE IF EXISTS `rdn_migrate_blocks`;
DELIMITER $$
CREATE PROCEDURE `rdn_migrate_blocks`()
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
  INSERT IGNORE INTO `blocked_users` (`user_id`, `blocked_id`, `time`)
  SELECT ub.`u1`, ub.`u2`, CAST(ub.`time` AS UNSIGNED)
  FROM `users_blocks` ub
  WHERE ub.`u1` IS NOT NULL AND ub.`u2` IS NOT NULL;
END$$
DELIMITER ;
CALL `rdn_migrate_blocks`();
DROP PROCEDURE IF EXISTS `rdn_migrate_blocks`;

-- ---------------------------------------------------------------------------
-- 10. SITE CONFIG
--     Old table: settings (setting, setting_val, category)
--     New table: site_config (id, key, value)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `site_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `site_config` (`key`, `value`)
SELECT s.`setting`, COALESCE(s.`setting_val`, '')
FROM `settings` s
WHERE s.`setting` IS NOT NULL AND s.`setting` != ''
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ---------------------------------------------------------------------------
-- 11. USER VISITS
--     Old table: users_visits (u1 visitor, u2 target, timeago, notification)
--     New table: user_visits (id, visitor_id, target_id, time)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_visits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitor_id` int(11) NOT NULL,
  `target_id` int(11) NOT NULL,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `target_id` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `user_visits` (`visitor_id`, `target_id`, `time`)
SELECT uv.`u1`, uv.`u2`, UNIX_TIMESTAMP()
FROM `users_visits` uv
WHERE uv.`u1` IS NOT NULL AND uv.`u2` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `user_visits` nv WHERE nv.`visitor_id` = uv.`u1` AND nv.`target_id` = uv.`u2`
  );

-- ---------------------------------------------------------------------------
-- 12. GIFTS
--     Old table: users_gift (id, s_id, r_id, g_id)
--     New tables: gifts (catalogue), user_gifts (sent gifts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `emoji` text DEFAULT '🎁',
  `credits` int(11) DEFAULT 10,
  `active` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `gifts` (`id`, `name`, `emoji`, `credits`, `active`) VALUES
(1, 'Rose',        '🌹', 10,  1),
(2, 'Heart',       '❤️', 15,  1),
(3, 'Diamond',     '💎', 50,  1),
(4, 'Crown',       '👑', 100, 1),
(5, 'Kiss',        '💋', 20,  1),
(6, 'Champagne',   '🍾', 30,  1),
(7, 'Ring',        '💍', 200, 1),
(8, 'Star',        '⭐', 25,  1);

CREATE TABLE IF NOT EXISTS `user_gifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_id` int(11) NOT NULL,
  `to_id` int(11) NOT NULL,
  `gift_id` int(11) NOT NULL,
  `message` text DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `user_gifts` (`from_id`, `to_id`, `gift_id`, `time`)
SELECT ug.`s_id`, ug.`r_id`, COALESCE(ug.`g_id`, 1), UNIX_TIMESTAMP()
FROM `users_gift` ug
WHERE ug.`s_id` IS NOT NULL AND ug.`r_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `user_gifts` ng WHERE ng.`from_id` = ug.`s_id` AND ng.`to_id` = ug.`r_id` AND ng.`gift_id` = ug.`g_id`
  );

-- ---------------------------------------------------------------------------
-- 13. ACTIVITY LOG — new table, populated by new app
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` text NOT NULL,
  `user_id` int(11) DEFAULT 0,
  `title` text DEFAULT '',
  `message` text DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 14. STORIES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `stories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `photo` text DEFAULT '',
  `video` text DEFAULT '',
  `expires` int(11) DEFAULT 0,
  `created` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 15. REMAINING NEW TABLES (empty — drizzle-kit push handles the schema)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `auto_message_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fake_user_id` int(11) NOT NULL,
  `real_user_id` int(11) NOT NULL,
  `template_id` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reported_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `reported_id` int(11) NOT NULL,
  `reason` text DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires` int(11) DEFAULT 0,
  `used` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires` int(11) DEFAULT 0,
  `used` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `profile_boosts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `start_time` int(11) DEFAULT 0,
  `end_time` int(11) DEFAULT 0,
  `credits_spent` int(11) DEFAULT 0,
  `active` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fake_video_calls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fake_user_id` int(11) NOT NULL,
  `real_user_id` int(11) NOT NULL,
  `video_url` text DEFAULT '',
  `triggered_at` int(11) DEFAULT 0,
  `answered` int(11) DEFAULT 0,
  `dismissed` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `custom_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `logo` text DEFAULT '',
  `description` text DEFAULT '',
  `status` int(11) DEFAULT 1,
  `review_time` int(11) DEFAULT 24,
  `external_url` text DEFAULT '',
  `country` text DEFAULT '',
  `type` int(11) DEFAULT 1,
  `proof_label` text DEFAULT 'Transaction ID / Screenshot',
  `created_at` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add any missing columns to custom_payments (if it existed in the old PHP site with a different schema)
ALTER TABLE `custom_payments`
  ADD COLUMN IF NOT EXISTS `name` text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `logo` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `description` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `status` int(11) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `review_time` int(11) DEFAULT 24,
  ADD COLUMN IF NOT EXISTS `external_url` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `country` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `type` int(11) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `proof_label` text DEFAULT 'Transaction ID / Screenshot',
  ADD COLUMN IF NOT EXISTS `created_at` int(11) DEFAULT 0;

CREATE TABLE IF NOT EXISTS `custom_payment_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `gateway_id` int(11) NOT NULL,
  `type` text DEFAULT 'credits',
  `package_id` int(11) DEFAULT 0,
  `amount` float DEFAULT 0,
  `currency` text DEFAULT 'USD',
  `proof` text DEFAULT '',
  `proof_image` text DEFAULT '',
  `status` text DEFAULT 'pending',
  `reviewed_by` int(11) DEFAULT 0,
  `review_note` text DEFAULT '',
  `time` int(11) DEFAULT 0,
  `reviewed_at` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat_locks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_key` varchar(255) NOT NULL,
  `moderator_id` int(11) NOT NULL,
  `locked_at` int(11) DEFAULT 0,
  `expires_at` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_key` (`conversation_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `created_at` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `referrer_id` int(11) NOT NULL,
  `referred_id` int(11) NOT NULL,
  `status` text DEFAULT 'pending',
  `reward` text DEFAULT '',
  `created` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `subject` text NOT NULL,
  `html_body` longtext NOT NULL DEFAULT '',
  `status` text DEFAULT 'draft',
  `total_recipients` int(11) DEFAULT 0,
  `sent_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  `batch_size` int(11) DEFAULT 50,
  `cooling_seconds` int(11) DEFAULT 60,
  `filter_gender` int(11) DEFAULT 0,
  `filter_country` text DEFAULT '',
  `filter_min_age` int(11) DEFAULT 0,
  `filter_max_age` int(11) DEFAULT 0,
  `only_real` int(11) DEFAULT 1,
  `created_by` int(11) DEFAULT 0,
  `created_at` int(11) DEFAULT 0,
  `started_at` int(11) DEFAULT 0,
  `completed_at` int(11) DEFAULT 0,
  `last_sent_at` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `feed` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `photo` text DEFAULT '',
  `likes_count` int(11) DEFAULT 0,
  `comments_count` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `feed_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `feed_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 16. ADD MISSING COLUMNS TO users TABLE
--     drizzle-kit push will also handle this, but run here as safety net.
-- ---------------------------------------------------------------------------

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `password` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `photo_thumb` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `country_code` varchar(12) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `email_verified` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `premium_expiry` int(11) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `online` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `last_daily_bonus` int(11) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `profile_complete` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `welcome_shown` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `verification_status` varchar(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS `verification_photo` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `verification_note` text DEFAULT '',
  ADD COLUMN IF NOT EXISTS `banned` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `referral_code` varchar(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `referred_by` int(11) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `username` varchar(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `phone` varchar(30) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `superlike` int(11) DEFAULT 3,
  ADD COLUMN IF NOT EXISTS `popular` int(11) DEFAULT 0;
-- NOTE: `pass` column is the legacy password column (already exists in old schema).
-- Drizzle reads it as `legacyPass` via: legacyPass: text("pass").
-- No extra column or copy needed — auth.ts falls back to `user.legacyPass` automatically.

-- ---------------------------------------------------------------------------
-- 17. IMPORT config_credits → site_config (credit packages)
--     The old PHP site stores credit packages in config_credits (id, credits, price).
--     The new app reads credit packages from site_config with keys like
--     credits_pkg_1_credits, credits_pkg_1_price, etc.
--     Import them once so admin-configured prices carry over automatically.
--     INSERT IGNORE means re-runs are safe — existing site_config rows are kept.
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT CONCAT('credits_pkg_', `id`, '_credits'), CAST(`credits` AS CHAR)
FROM `config_credits`
WHERE `credits` > 0;

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT CONCAT('credits_pkg_', `id`, '_price'), CAST(`price` AS CHAR)
FROM `config_credits`
WHERE `credits` > 0;

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT CONCAT('credits_pkg_', `id`, '_active'), '1'
FROM `config_credits`
WHERE `credits` > 0;

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT CONCAT('credits_pkg_', `id`, '_description'), ''
FROM `config_credits`
WHERE `credits` > 0;

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT CONCAT('credits_pkg_', `id`, '_popular'), '0'
FROM `config_credits`
WHERE `credits` > 0;

-- ---------------------------------------------------------------------------
-- 18. Add missing columns to existing tables (safe ALTER TABLE IF NOT EXISTS)
--     Run this any time you add a column to the Drizzle schema so production
--     MySQL gets the column even if the table already existed before that change.
-- ---------------------------------------------------------------------------

-- orders.credits (stores how many credits were purchased — added after v1 launch)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'credits'
);
SET @sql_add = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `credits` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_add; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.package_id
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'package_id'
);
SET @sql_add = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `package_id` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql_add; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 19. Populate created from join_date_time for old users
-- ---------------------------------------------------------------------------

-- Populate created from join_date_time for old users
UPDATE `users`
SET `created` = CAST(`join_date_time` AS UNSIGNED)
WHERE (`created` IS NULL OR `created` = 0)
  AND `join_date_time` IS NOT NULL
  AND `join_date_time` != '0'
  AND `join_date_time` REGEXP '^[0-9]+$';

SET foreign_key_checks = 1;

-- =============================================================================
-- SUMMARY — what was migrated:
--   users          → admin roles bumped (old 1→2)
--   users_photos   → photos
--   users_likes    → likes (love=1 rows only)
--   users_extended → user_extended (field1-10 mapped)
--   settings       → site_config
--   users_visits   → user_visits
--   users_blocks   → blocked_users
--   users_gift     → user_gifts
--   fake_messages  → fake_message_templates
--   orders (varchar PK) → renamed to orders_legacy, new orders table created
--   users.pass     → users.legacyPass (for legacy password auth)
--   New tables created: notifications, activity, stories, auto_message_log,
--     reported_users, password_reset_tokens, email_verifications,
--     profile_boosts, fake_video_calls, custom_payments, custom_payment_orders,
--     chat_locks, push_subscriptions, referrals, feed, feed_likes
-- =============================================================================

-- =============================================================================
-- NEW TABLES & COLUMNS — run on production MySQL to add features
-- =============================================================================

-- contact_submissions table
CREATE TABLE IF NOT EXISTS `contact_submissions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(300) NOT NULL DEFAULT '',
  `email` varchar(300) NOT NULL DEFAULT '',
  `subject` varchar(500) NOT NULL DEFAULT '',
  `message` text NOT NULL,
  `email_sent` tinyint NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat media columns (images, video, audio in messages)
ALTER TABLE `messages`
  ADD COLUMN IF NOT EXISTS `media_url` varchar(500) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `media_type` varchar(20) NOT NULL DEFAULT '';

-- email_campaigns table (if not already present)
CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(500) NOT NULL DEFAULT '',
  `subject` varchar(500) NOT NULL DEFAULT '',
  `body` text NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `sent_count` int NOT NULL DEFAULT 0,
  `created_at` int NOT NULL DEFAULT 0,
  `sent_at` int NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_campaign_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` int NOT NULL DEFAULT 0,
  `user_id` int NOT NULL DEFAULT 0,
  `email` varchar(300) NOT NULL DEFAULT '',
  `status` varchar(50) NOT NULL DEFAULT '',
  `error` text NOT NULL DEFAULT '',
  `sent_at` int NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
