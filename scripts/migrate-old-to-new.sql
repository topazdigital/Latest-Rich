-- ==========================================================================
-- Rich Dating Network — Old PHP → New Node.js Schema Migration
-- Run this on `admin_testdating` AFTER the old SQL dump has been imported.
--
-- HOW TO RUN IN phpMyAdmin:
--   1. Click on admin_testdating in the left panel
--   2. Click the SQL tab at the top
--   3. Paste this entire file and click Go
--   4. If any RENAME errors appear, see the note at the top of Step 1
-- ==========================================================================

-- ==========================================================================
-- STEP 1: Safely rename old conflicting tables to old_ prefix
-- Uses stored procedures so it won't fail if a table doesn't exist
-- or was already renamed in a previous run.
-- ==========================================================================

DROP PROCEDURE IF EXISTS safe_rename_table;

DELIMITER //
CREATE PROCEDURE safe_rename_table(
  IN p_from VARCHAR(64),
  IN p_to   VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_from
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_to
  ) THEN
    SET @sql = CONCAT('RENAME TABLE `', p_from, '` TO `', p_to, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL safe_rename_table('activity',       'old_activity');
CALL safe_rename_table('blocked_users',  'old_blocked_bans');
CALL safe_rename_table('photos',         'old_photo_comments');
CALL safe_rename_table('feed',           'old_feed');
CALL safe_rename_table('gifts',          'old_gifts');
CALL safe_rename_table('chat',           'old_chat');
CALL safe_rename_table('referrals',      'old_referrals_config');
CALL safe_rename_table('reports',        'old_reports');

DROP PROCEDURE IF EXISTS safe_rename_table;


-- ==========================================================================
-- STEP 2: Add new columns to the `users` table
-- ADD COLUMN IF NOT EXISTS is safe to re-run
-- ==========================================================================

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
  ADD COLUMN IF NOT EXISTS `referred_by`         INT(11)      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `phone`               VARCHAR(30)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `country_code`        VARCHAR(10)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `username`            VARCHAR(80)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `birthday`            VARCHAR(20)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `looking`             TINYINT(1)   DEFAULT 2,
  ADD COLUMN IF NOT EXISTS `superlike`           INT(11)      DEFAULT 3,
  ADD COLUMN IF NOT EXISTS `popular`             TINYINT(1)   DEFAULT 0;

-- Populate phone from old telephone column (with country code prefix)
UPDATE `users`
SET `phone` = CONCAT(
  COALESCE((SELECT `title` FROM `config` WHERE `name` = 'phone_code' LIMIT 1), ''),
  COALESCE(`telephone`, '')
)
WHERE (`phone` IS NULL OR `phone` = '')
  AND `telephone` IS NOT NULL
  AND `telephone` != '';

-- Copy old pass/password to new password column where empty
UPDATE `users`
SET `password` = COALESCE(`pass`, '')
WHERE (`password` IS NULL OR `password` = '')
  AND `pass` IS NOT NULL AND `pass` != '';

-- Bump old admin=1 (was "admin") → admin=2 (new: 2=admin, 1=moderator)
UPDATE `users` SET `admin` = 2 WHERE `admin` = 1 AND `fake` = 0;

-- Mark banned users from old site-ban table (email-based)
UPDATE `users` u
INNER JOIN `old_blocked_bans` ob ON u.`email` = ob.`email`
SET u.`banned` = 1
WHERE ob.`email` IS NOT NULL;


-- ==========================================================================
-- STEP 3: Migrate chat → messages
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `messages` (
  `id`      INT(11)  NOT NULL AUTO_INCREMENT,
  `u1`      INT(11)  NOT NULL,
  `u2`      INT(11)  NOT NULL,
  `message` LONGTEXT NOT NULL,
  `time`    INT(11)  DEFAULT 0,
  `read`    INT(11)  DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_messages_u1` (`u1`),
  KEY `idx_messages_u2` (`u2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `messages` (`id`, `u1`, `u2`, `message`, `time`, `read`)
SELECT
  c.`id`,
  c.`s_id`,
  c.`r_id`,
  c.`message`,
  CAST(c.`time` AS SIGNED),
  c.`seen`
FROM `old_chat` c
WHERE c.`s_id` > 0
  AND c.`r_id` > 0
  AND c.`s_id` IN (SELECT `id` FROM `users`)
  AND c.`r_id` IN (SELECT `id` FROM `users`);


-- ==========================================================================
-- STEP 4: Create new photos table (user profile photos, fresh start)
-- The uploads folder files will be linked when users log in/upload
-- ==========================================================================

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


-- ==========================================================================
-- STEP 5: Migrate feed
-- ==========================================================================

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

INSERT IGNORE INTO `feed` (`id`, `user_id`, `content`, `photo`, `likes_count`, `comments_count`, `time`)
SELECT
  f.`id`,
  f.`uid`,
  COALESCE(f.`post_meta`, ''),
  COALESCE(f.`post_src`, ''),
  COALESCE(f.`likes`, 0),
  COALESCE(f.`comments`, 0),
  CAST(COALESCE(f.`time`, '0') AS SIGNED)
FROM `old_feed` f
WHERE f.`uid` IS NOT NULL
  AND f.`uid` > 0
  AND f.`uid` IN (SELECT `id` FROM `users`)
  AND f.`visible` = 1;


-- ==========================================================================
-- STEP 6: Migrate activity log (last 50 000 rows)
-- ==========================================================================

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

INSERT IGNORE INTO `activity` (`id`, `type`, `user_id`, `title`, `message`, `time`)
SELECT
  a.`id`,
  COALESCE(a.`a_type`, 'system'),
  COALESCE(a.`uid`, 0),
  COALESCE(a.`title`, ''),
  COALESCE(a.`message`, ''),
  CASE
    WHEN a.`time` REGEXP '^[0-9]+$' THEN CAST(a.`time` AS SIGNED)
    ELSE 0
  END
FROM `old_activity` a
ORDER BY a.`id` DESC
LIMIT 50000;


-- ==========================================================================
-- STEP 7: Migrate gifts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `gifts` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`    VARCHAR(60)      NOT NULL,
  `emoji`   VARCHAR(20)      DEFAULT '🎁',
  `credits` INT(11)          DEFAULT 10,
  `active`  TINYINT(1)       DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `gifts` (`id`, `name`, `emoji`, `credits`, `active`)
SELECT g.`id`, g.`gift`, '🎁', COALESCE(g.`price`, 10), 1
FROM `old_gifts` g;


-- ==========================================================================
-- STEP 8: Create likes table (no equivalent in old system)
-- ==========================================================================

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


-- ==========================================================================
-- STEP 9: Create new blocked_users (user-to-user blocks, fresh start)
-- The old blocked_users was email-based site bans — now saved as old_blocked_bans
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11) UNSIGNED NOT NULL,
  `blocked_id` INT(11) UNSIGNED NOT NULL,
  `time`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==========================================================================
-- STEP 10: Migrate reports → reported_users
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `reported_users` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) UNSIGNED NOT NULL,
  `reported_id` INT(11) UNSIGNED NOT NULL,
  `reason`      TEXT             DEFAULT '',
  `time`        INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `reported_users` (`user_id`, `reported_id`, `reason`, `time`)
SELECT
  r.`reported_by`,
  r.`reported`,
  COALESCE(r.`reason`, ''),
  CASE
    WHEN r.`reported_date` REGEXP '^[0-9]+$' THEN CAST(r.`reported_date` AS SIGNED)
    ELSE 0
  END
FROM `old_reports` r
WHERE r.`reported_by` IS NOT NULL
  AND r.`reported`    IS NOT NULL
  AND r.`reported_by` IN (SELECT `id` FROM `users`)
  AND r.`reported`    IN (SELECT `id` FROM `users`);


-- ==========================================================================
-- STEP 11: Migrate fake_messages → fake_message_templates
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `fake_message_templates` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `message` TEXT             NOT NULL,
  `active`  TINYINT(1)       DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `fake_message_templates` (`id`, `message`, `active`)
SELECT `id`, `fake_msg`, 1
FROM `fake_messages`
WHERE `fake_msg` IS NOT NULL AND `fake_msg` != '';


-- ==========================================================================
-- STEP 12: Create all remaining new tables (safe — IF NOT EXISTS)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `feed_likes` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `feed_id` INT(11)          NOT NULL,
  `user_id` INT(11)          NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feed_likes` (`feed_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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


-- ==========================================================================
-- STEP 13: Seed site_config from old config table
-- ==========================================================================

INSERT IGNORE INTO `site_config` (`key`, `value`)
SELECT `name`, `title`
FROM `config`
WHERE `name` IN (
  'site_name','site_email','site_url','currency',
  'credits_name','phone_code','site_description'
);


-- ==========================================================================
-- STEP 14: Performance indexes (safe — ADD INDEX IF NOT EXISTS)
-- ==========================================================================

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_fake`        (`fake`),
  ADD INDEX IF NOT EXISTS `idx_users_premium`     (`premium`),
  ADD INDEX IF NOT EXISTS `idx_users_banned`      (`banned`),
  ADD INDEX IF NOT EXISTS `idx_users_admin`       (`admin`),
  ADD INDEX IF NOT EXISTS `idx_users_last_access` (`last_access`);

-- ==========================================================================
-- DONE.
-- Next step: run  node scripts/hash-passwords.mjs  on the test server
-- to convert all user passwords to bcrypt format.
-- ==========================================================================
