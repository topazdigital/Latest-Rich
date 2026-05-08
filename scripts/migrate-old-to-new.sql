-- ==========================================================================
-- Rich Dating Network — Old PHP → New Node.js Schema Migration
-- Run this on `admin_testdating` AFTER the old SQL dump has been imported.
-- Run in phpMyAdmin > SQL tab, or via MySQL CLI.
-- Safe to run in order — each step is independent.
-- ==========================================================================

-- STEP 1: Rename conflicting old tables to old_ prefix
-- (These have the same name but different structure in the new code)
-- -------------------------------------------------------------------------

RENAME TABLE `activity`      TO `old_activity`;
RENAME TABLE `blocked_users` TO `old_blocked_bans`;
RENAME TABLE `photos`        TO `old_photo_comments`;
RENAME TABLE `feed`          TO `old_feed`;
RENAME TABLE `gifts`         TO `old_gifts`;
RENAME TABLE `chat`          TO `old_chat`;
RENAME TABLE `referrals`     TO `old_referrals_config`;

-- Rename reports if it exists (new uses reported_users)
RENAME TABLE `reports` TO `old_reports`;


-- STEP 2: Add missing columns to the `users` table
-- -------------------------------------------------------------------------

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `photo`               TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS `photo_thumb`         TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS `email_verified`      TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `premium_expiry`      INT(11)      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `online`              TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `last_daily_bonus`    INT(11)      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `profile_complete`    TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `welcome_shown`       TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `verification_status` VARCHAR(20)  DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS `verification_photo`  TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS `verification_note`   TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS `banned`              TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `referral_code`       VARCHAR(50)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `referred_by`         INT(11)      DEFAULT 0;

-- Map the old `pass` column to `password` if password column is empty
-- (keeps DES-crypt hashes as fallback — hash-passwords.mjs will overwrite with bcrypt)
UPDATE `users`
SET `password` = `pass`
WHERE (`password` IS NULL OR `password` = '')
  AND `pass` IS NOT NULL AND `pass` != '';

-- Bump old admin=1 (was "admin") to admin=2 (new system: 2=admin, 1=moderator)
UPDATE `users` SET `admin` = 2 WHERE `admin` = 1 AND `fake` = 0;

-- Mark banned users based on old site-ban table (by email match)
UPDATE `users` u
INNER JOIN `old_blocked_bans` ob ON u.`email` = ob.`email`
SET u.`banned` = 1;

-- Copy phone number into the new `phone` column (old column is `telephone`)
UPDATE `users`
SET `phone` = CONCAT(COALESCE(`country_code`, ''), COALESCE(`telephone`, ''))
WHERE (`phone` IS NULL OR `phone` = '')
  AND `telephone` IS NOT NULL AND `telephone` != '';


-- STEP 3: Create new `messages` table (from old `chat`)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `messages` (
  `id`      INT(11)      NOT NULL AUTO_INCREMENT,
  `u1`      INT(11)      NOT NULL,
  `u2`      INT(11)      NOT NULL,
  `message` LONGTEXT     NOT NULL,
  `time`    INT(11)      DEFAULT 0,
  `read`    INT(11)      DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_messages_u1` (`u1`),
  KEY `idx_messages_u2` (`u2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `messages` (`id`, `u1`, `u2`, `message`, `time`, `read`)
SELECT
  `id`,
  `s_id`,
  `r_id`,
  `message`,
  CAST(`time` AS SIGNED),
  `seen`
FROM `old_chat`
WHERE `s_id` > 0
  AND `r_id` > 0
  AND `s_id` IN (SELECT `id` FROM `users`)
  AND `r_id` IN (SELECT `id` FROM `users`);


-- STEP 4: Create new `photos` table (user profile photos)
-- The old uploads folder files will be linked via the node upload routes.
-- Populate from photo URLs found in user activity JSON where possible.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `photos` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)          NOT NULL,
  `photo`       TEXT             NOT NULL,
  `thumb`       TEXT             DEFAULT '',
  `approved`    TINYINT(1)       DEFAULT 1,
  `flagged`     TINYINT(1)       DEFAULT 0,
  `flag_reason` TEXT             DEFAULT '',
  `main`        TINYINT(1)       DEFAULT 0,
  `created`     INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_photos_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 5: Create new `feed` table (from old `old_feed`)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `feed` (
  `id`             INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT(11)          NOT NULL,
  `content`        TEXT             NOT NULL,
  `photo`          TEXT             DEFAULT '',
  `likes_count`    INT(11)          DEFAULT 0,
  `comments_count` INT(11)          DEFAULT 0,
  `time`           INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_feed_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `feed` (`id`, `user_id`, `content`, `photo`, `likes_count`, `comments_count`, `time`)
SELECT
  `id`,
  `uid`,
  COALESCE(`post_meta`, ''),
  COALESCE(`post_src`, ''),
  COALESCE(`likes`, 0),
  COALESCE(`comments`, 0),
  CAST(COALESCE(`time`, '0') AS SIGNED)
FROM `old_feed`
WHERE `uid` IS NOT NULL
  AND `uid` > 0
  AND `uid` IN (SELECT `id` FROM `users`)
  AND `visible` = 1;


-- STEP 6: Create new `feed_likes` table
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `feed_likes` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `feed_id` INT(11)          NOT NULL,
  `user_id` INT(11)          NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feed_likes` (`feed_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 7: Create new `activity` table (from old `old_activity`)
-- Only import the last 50,000 rows for performance
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `activity` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`    VARCHAR(40)      NOT NULL,
  `user_id` INT(11)          DEFAULT 0,
  `title`   VARCHAR(200)     DEFAULT '',
  `message` TEXT             DEFAULT '',
  `time`    INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_activity_time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `activity` (`id`, `type`, `user_id`, `title`, `message`, `time`)
SELECT
  `id`,
  COALESCE(`a_type`, 'system'),
  COALESCE(`uid`, 0),
  COALESCE(`title`, ''),
  COALESCE(`message`, ''),
  CASE
    WHEN `time` REGEXP '^[0-9]+$' THEN CAST(`time` AS SIGNED)
    ELSE 0
  END
FROM `old_activity`
ORDER BY `id` DESC
LIMIT 50000;


-- STEP 8: Create new `gifts` table (from old `old_gifts`)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `gifts` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`    VARCHAR(60)      NOT NULL,
  `emoji`   VARCHAR(20)      DEFAULT '🎁',
  `credits` INT(11)          DEFAULT 10,
  `active`  TINYINT(1)       DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `gifts` (`id`, `name`, `emoji`, `credits`, `active`)
SELECT `id`, `gift`, '🎁', COALESCE(`price`, 10), 1
FROM `old_gifts`;


-- STEP 9: Create new `likes` table (start fresh — no equivalent in old system)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `likes` (
  `id`        INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`   INT(11)          NOT NULL,
  `target_id` INT(11)          NOT NULL,
  `superlike` INT(11)          DEFAULT 0,
  `created`   INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_likes_user_id`   (`user_id`),
  KEY `idx_likes_target_id` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 10: Create new `blocked_users` table (user-to-user blocks, fresh start)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11) UNSIGNED NOT NULL,
  `blocked_id` INT(11) UNSIGNED NOT NULL,
  `time`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 11: Create new `reported_users` table (from old `old_reports`)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `reported_users` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) UNSIGNED NOT NULL,
  `reported_id` INT(11) UNSIGNED NOT NULL,
  `reason`      TEXT             DEFAULT '',
  `time`        INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `reported_users` (`user_id`, `reported_id`, `reason`, `time`)
SELECT
  `reported_by`,
  `reported`,
  COALESCE(`reason`, ''),
  CASE
    WHEN `reported_date` REGEXP '^[0-9]+$' THEN CAST(`reported_date` AS SIGNED)
    ELSE 0
  END
FROM `old_reports`
WHERE `reported_by` IS NOT NULL
  AND `reported` IS NOT NULL
  AND `reported_by` IN (SELECT `id` FROM `users`)
  AND `reported` IN (SELECT `id` FROM `users`);


-- STEP 12: Create new `fake_message_templates` (from old `fake_messages`)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `fake_message_templates` (
  `id`     INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `message` TEXT            NOT NULL,
  `active`  TINYINT(1)      DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `fake_message_templates` (`id`, `message`, `active`)
SELECT `id`, `fake_msg`, 1
FROM `fake_messages`
WHERE `fake_msg` IS NOT NULL AND `fake_msg` != '';


-- STEP 13: Create all remaining new tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11)          NOT NULL,
  `from_id` INT(11)          DEFAULT NULL,
  `type`    VARCHAR(40)      NOT NULL,
  `message` TEXT             NOT NULL,
  `link`    VARCHAR(255)     DEFAULT '',
  `read`    TINYINT(1)       DEFAULT 0,
  `time`    INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`                INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           INT(11)          NOT NULL,
  `amount`            DECIMAL(10,2)    DEFAULT 0,
  `currency`          VARCHAR(10)      DEFAULT 'USD',
  `type`              VARCHAR(20)      DEFAULT 'credits',
  `description`       TEXT             DEFAULT '',
  `status`            VARCHAR(20)      DEFAULT 'pending',
  `stripe_session_id` VARCHAR(255)     DEFAULT '',
  `credits`           INT(11)          DEFAULT 0,
  `package_id`        INT(11)          DEFAULT 0,
  `time`              INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stories` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11)          NOT NULL,
  `photo`   TEXT             DEFAULT '',
  `video`   TEXT             DEFAULT '',
  `expires` INT(11)          DEFAULT 0,
  `created` INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_extended` (
  `id`               INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          INT(11)          NOT NULL,
  `occupation`       VARCHAR(120)     DEFAULT '',
  `education`        VARCHAR(120)     DEFAULT '',
  `height`           VARCHAR(20)      DEFAULT '',
  `body_type`        VARCHAR(40)      DEFAULT '',
  `ethnicity`        VARCHAR(40)      DEFAULT '',
  `religion`         VARCHAR(40)      DEFAULT '',
  `smoking`          VARCHAR(20)      DEFAULT '',
  `drinking`         VARCHAR(20)      DEFAULT '',
  `children`         VARCHAR(30)      DEFAULT '',
  `relationship`     VARCHAR(40)      DEFAULT '',
  `interests`        TEXT             DEFAULT '',
  `looking_for_age`  VARCHAR(20)      DEFAULT '',
  `ideal_date`       TEXT             DEFAULT '',
  `passions`         TEXT             DEFAULT '',
  `self_description` TEXT             DEFAULT '',
  `favorite_travel`  TEXT             DEFAULT '',
  `fun_activities`   TEXT             DEFAULT '',
  `languages`        TEXT             DEFAULT '',
  `zodiac`           VARCHAR(20)      DEFAULT '',
  `personality_type` VARCHAR(20)      DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_extended_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_visits` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `visitor_id` INT(11)          NOT NULL,
  `target_id`  INT(11)          NOT NULL,
  `time`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_visits_visitor` (`visitor_id`),
  KEY `idx_visits_target`  (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_gifts` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_id` INT(11)          NOT NULL,
  `to_id`   INT(11)          NOT NULL,
  `gift_id` INT(11)          NOT NULL,
  `message` TEXT             DEFAULT '',
  `time`    INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `site_config` (
  `id`    INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`   VARCHAR(80)      NOT NULL,
  `value` TEXT             DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_site_config_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auto_message_log` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fake_user_id` INT(11)          NOT NULL,
  `real_user_id` INT(11)          NOT NULL,
  `template_id`  INT(11)          DEFAULT 0,
  `time`         INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11)          NOT NULL,
  `token`   VARCHAR(120)     NOT NULL,
  `expires` INT(11)          DEFAULT 0,
  `used`    TINYINT(1)       DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prt_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11)          NOT NULL,
  `token`   VARCHAR(120)     NOT NULL,
  `expires` INT(11)          DEFAULT 0,
  `used`    TINYINT(1)       DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ev_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `profile_boosts` (
  `id`            INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT(11)          NOT NULL,
  `start_time`    INT(11)          DEFAULT 0,
  `end_time`      INT(11)          DEFAULT 0,
  `credits_spent` INT(11)          DEFAULT 0,
  `active`        TINYINT(1)       DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fake_video_calls` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fake_user_id` INT(11)          NOT NULL,
  `real_user_id` INT(11)          NOT NULL,
  `video_url`    VARCHAR(255)     DEFAULT '',
  `triggered_at` INT(11)          DEFAULT 0,
  `answered`     TINYINT(1)       DEFAULT 0,
  `dismissed`    TINYINT(1)       DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `custom_payments` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(80)      NOT NULL,
  `logo`         VARCHAR(255)     DEFAULT '',
  `description`  TEXT             DEFAULT '',
  `status`       TINYINT(1)       DEFAULT 1,
  `review_time`  INT(11)          DEFAULT 24,
  `external_url` VARCHAR(255)     DEFAULT '',
  `country`      VARCHAR(10)      DEFAULT '',
  `type`         TINYINT(1)       DEFAULT 1,
  `proof_label`  VARCHAR(120)     DEFAULT 'Transaction ID / Screenshot',
  `created_at`   INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `custom_payment_orders` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)          NOT NULL,
  `gateway_id`  INT(11)          NOT NULL,
  `type`        VARCHAR(20)      DEFAULT 'credits',
  `package_id`  INT(11)          DEFAULT 0,
  `amount`      DECIMAL(10,2)    DEFAULT 0,
  `currency`    VARCHAR(10)      DEFAULT 'USD',
  `proof`       TEXT             DEFAULT '',
  `proof_image` VARCHAR(255)     DEFAULT '',
  `status`      VARCHAR(20)      DEFAULT 'pending',
  `reviewed_by` INT(11)          DEFAULT 0,
  `review_note` TEXT             DEFAULT '',
  `time`        INT(11)          DEFAULT 0,
  `reviewed_at` INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat_locks` (
  `id`               INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_key` VARCHAR(60)      NOT NULL,
  `moderator_id`     INT(11)          NOT NULL,
  `locked_at`        INT(11)          DEFAULT 0,
  `expires_at`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_locks_conv` (`conversation_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11)          NOT NULL,
  `endpoint`   TEXT             NOT NULL,
  `p256dh`     TEXT             NOT NULL,
  `auth`       VARCHAR(60)      NOT NULL,
  `created_at` INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `referrals` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_id` INT(11)          NOT NULL,
  `referred_id` INT(11)          NOT NULL,
  `status`      VARCHAR(20)      DEFAULT 'pending',
  `reward`      TEXT             DEFAULT '',
  `created`     INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 14: Seed site_config with settings from old `config` / `settings` tables
-- Copy key site settings across
-- -------------------------------------------------------------------------

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT `name`, `title`
FROM `config`
WHERE `name` IN ('site_name','site_email','site_url','currency','credits_name');


-- STEP 15: Performance indexes
-- -------------------------------------------------------------------------

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_fake`        (`fake`),
  ADD INDEX IF NOT EXISTS `idx_users_premium`     (`premium`),
  ADD INDEX IF NOT EXISTS `idx_users_banned`      (`banned`),
  ADD INDEX IF NOT EXISTS `idx_users_admin`       (`admin`),
  ADD INDEX IF NOT EXISTS `idx_users_last_access` (`last_access`);

-- ==========================================================================
-- DONE. Next step: run  node scripts/hash-passwords.mjs  on the server
-- to convert all plaintext passwords to bcrypt hashes.
-- ==========================================================================
