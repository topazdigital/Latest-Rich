-- ==========================================================================
-- RDN: Create any tables that were missed by the initial migration
-- Safe to run multiple times — all use CREATE TABLE IF NOT EXISTS
-- Run: mysql -u admin_testdating -p admin_testdating < scripts/fix-missing-tables.sql
-- ==========================================================================

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

CREATE TABLE IF NOT EXISTS `stories` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11)          NOT NULL,
  `photo`   VARCHAR(255)     DEFAULT '',
  `caption` TEXT             DEFAULT '',
  `expires` INT(11)          DEFAULT 0,
  `time`    INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11)          NOT NULL,
  `type`       VARCHAR(20)      DEFAULT 'credits',
  `package_id` INT(11)          DEFAULT 0,
  `amount`     DECIMAL(10,2)    DEFAULT 0,
  `currency`   VARCHAR(10)      DEFAULT 'USD',
  `gateway`    VARCHAR(40)      DEFAULT '',
  `status`     VARCHAR(20)      DEFAULT 'pending',
  `ref`        VARCHAR(120)     DEFAULT '',
  `time`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default gifts if empty
INSERT IGNORE INTO `gifts` (`id`, `name`, `emoji`, `credits`, `active`) VALUES
  (1,  'Rose',       '🌹', 10,  1),
  (2,  'Heart',      '❤️', 15,  1),
  (3,  'Diamond',    '💎', 50,  1),
  (4,  'Crown',      '👑', 100, 1),
  (5,  'Kiss',       '💋', 20,  1),
  (6,  'Champagne',  '🍾', 30,  1),
  (7,  'Ring',       '💍', 200, 1),
  (8,  'Star',       '⭐', 25,  1);

-- Seed site_config base values if missing
INSERT IGNORE INTO `site_config` (`key`, `value`) VALUES
  ('site_name',        'Rich Dating Network'),
  ('site_url',         'https://richdatingnetwork.com'),
  ('site_email',       'info@richdatingnetwork.com'),
  ('currency',         'USD'),
  ('credits_name',     'Credits'),
  ('credits_per_message', '0'),
  ('referral_reward_tiers', '');

-- Ensure created column exists (mapped from join_date_time)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `created` INT(11) DEFAULT 0;

UPDATE `users`
SET `created` = CAST(`join_date_time` AS SIGNED)
WHERE `join_date_time` REGEXP '^[0-9]+$'
  AND (`created` IS NULL OR `created` = 0);

-- Ensure phone column is populated from telephone
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `phone` VARCHAR(30) DEFAULT '';

UPDATE `users`
SET `phone` = `telephone`
WHERE (`phone` IS NULL OR `phone` = '')
  AND `telephone` IS NOT NULL
  AND `telephone` != '';

-- Fix any remaining NULL banned values
UPDATE `users` SET `banned` = 0 WHERE `banned` IS NULL;

-- Confirm
SELECT 'Tables created OK' AS status;
SHOW TABLES;
