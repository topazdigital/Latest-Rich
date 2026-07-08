-- ==========================================================
-- Rich Dating Network — MySQL Migration Script
-- Run this in phpMyAdmin (or MySQL CLI) on your existing DB
-- to add new columns/tables from the new codebase.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ==========================================================

-- ─── NEW COLUMNS ON `users` TABLE ──────────────────────────

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `username`           VARCHAR(80)  DEFAULT NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS `phone`              VARCHAR(30)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `birthday`           VARCHAR(20)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `country_code`       VARCHAR(10)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `looking`            TINYINT(1)   DEFAULT 2,
  ADD COLUMN IF NOT EXISTS `email_verified`     TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `premium_expiry`     INT(11)      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `superlike`          INT(11)      DEFAULT 3,
  ADD COLUMN IF NOT EXISTS `popular`            TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `online`             TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `last_daily_bonus`   INT(11)      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `profile_complete`   TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `welcome_shown`      TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `verification_status` VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS `verification_photo` VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `verification_note`  TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS `lat`                VARCHAR(20)  DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `lng`                VARCHAR(20)  DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `photo_thumb`        VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `profile_photo`      VARCHAR(255) DEFAULT '';

-- Rename admin column: old site used admin=1 for admin, new uses admin=2 for admin, admin=1 for moderator
-- If your old site has admin=1 for admins, run:
-- UPDATE `users` SET `admin` = 2 WHERE `admin` = 1;

-- ─── NEW COLUMNS ON `orders` TABLE ──────────────────────────

ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `amount_usd` FLOAT DEFAULT 0 COMMENT 'USD equivalent at time of payment (for revenue reporting)';

-- ─── NEW TABLES ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `user_extended` (
  `id`               INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          INT(11) UNSIGNED NOT NULL,
  `occupation`       VARCHAR(120) DEFAULT '',
  `education`        VARCHAR(120) DEFAULT '',
  `height`           VARCHAR(20)  DEFAULT '',
  `body_type`        VARCHAR(40)  DEFAULT '',
  `ethnicity`        VARCHAR(40)  DEFAULT '',
  `religion`         VARCHAR(40)  DEFAULT '',
  `smoking`          VARCHAR(20)  DEFAULT '',
  `drinking`         VARCHAR(20)  DEFAULT '',
  `children`         VARCHAR(30)  DEFAULT '',
  `relationship`     VARCHAR(40)  DEFAULT '',
  `interests`        TEXT         DEFAULT '',
  `looking_for_age`  VARCHAR(20)  DEFAULT '',
  `ideal_date`       TEXT         DEFAULT '',
  `passions`         TEXT         DEFAULT '',
  `self_description` TEXT         DEFAULT '',
  `favorite_travel`  TEXT         DEFAULT '',
  `fun_activities`   TEXT         DEFAULT '',
  `languages`        TEXT         DEFAULT '',
  `zodiac`           VARCHAR(20)  DEFAULT '',
  `personality_type` VARCHAR(20)  DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_extended_user_id` (`user_id`),
  CONSTRAINT `fk_user_extended_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stories` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `photo`   VARCHAR(255) DEFAULT '',
  `video`   VARCHAR(255) DEFAULT '',
  `expires` INT(11)      DEFAULT 0,
  `created` INT(11)      DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_stories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fake_message_templates` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `message` TEXT         NOT NULL,
  `active`  TINYINT(1)   DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auto_message_log` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fake_user_id` INT(11) UNSIGNED NOT NULL,
  `real_user_id` INT(11) UNSIGNED NOT NULL,
  `template_id`  INT(11)          DEFAULT 0,
  `time`         INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_visits` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `visitor_id` INT(11) UNSIGNED NOT NULL,
  `target_id`  INT(11) UNSIGNED NOT NULL,
  `time`       INT(11)          DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_visits_visitor` FOREIGN KEY (`visitor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visits_target`  FOREIGN KEY (`target_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gifts` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`    VARCHAR(60)  NOT NULL,
  `emoji`   VARCHAR(10)  DEFAULT '🎁',
  `credits` INT(11)      DEFAULT 10,
  `active`  TINYINT(1)   DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_gifts` (
  `id`       INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_id`  INT(11) UNSIGNED NOT NULL,
  `to_id`    INT(11) UNSIGNED NOT NULL,
  `gift_id`  INT(11) UNSIGNED NOT NULL,
  `message`  TEXT     DEFAULT '',
  `time`     INT(11)  DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_gifts_from` FOREIGN KEY (`from_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_gifts_to`   FOREIGN KEY (`to_id`)   REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `site_config` (
  `id`    INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`   VARCHAR(80)  NOT NULL,
  `value` TEXT         DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_site_config_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `activity` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`    VARCHAR(40)  NOT NULL,
  `user_id` INT(11)      DEFAULT 0,
  `title`   VARCHAR(200) DEFAULT '',
  `message` TEXT         DEFAULT '',
  `time`    INT(11)      DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11) UNSIGNED NOT NULL,
  `blocked_id` INT(11) UNSIGNED NOT NULL,
  `time`       INT(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_blocked_user`    FOREIGN KEY (`user_id`)    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blocked_blocked` FOREIGN KEY (`blocked_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reported_users` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) UNSIGNED NOT NULL,
  `reported_id` INT(11) UNSIGNED NOT NULL,
  `reason`      TEXT     DEFAULT '',
  `time`        INT(11)  DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_reports_user`     FOREIGN KEY (`user_id`)     REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_reported` FOREIGN KEY (`reported_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `token`   VARCHAR(120) NOT NULL,
  `expires` INT(11) DEFAULT 0,
  `used`    TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prt_token` (`token`),
  CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id`      INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) UNSIGNED NOT NULL,
  `token`   VARCHAR(120) NOT NULL,
  `expires` INT(11) DEFAULT 0,
  `used`    TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ev_token` (`token`),
  CONSTRAINT `fk_ev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `profile_boosts` (
  `id`            INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT(11) UNSIGNED NOT NULL,
  `start_time`    INT(11) DEFAULT 0,
  `end_time`      INT(11) DEFAULT 0,
  `credits_spent` INT(11) DEFAULT 0,
  `active`        TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_boosts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fake_video_calls` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `fake_user_id` INT(11) UNSIGNED NOT NULL,
  `real_user_id` INT(11) UNSIGNED NOT NULL,
  `video_url`    VARCHAR(255) DEFAULT '',
  `triggered_at` INT(11) DEFAULT 0,
  `answered`     TINYINT(1) DEFAULT 0,
  `dismissed`    TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_fvc_fake` FOREIGN KEY (`fake_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fvc_real` FOREIGN KEY (`real_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `custom_payments` (
  `id`           INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(80)  NOT NULL,
  `logo`         VARCHAR(255) DEFAULT '',
  `description`  TEXT         DEFAULT '',
  `status`       TINYINT(1)   DEFAULT 1,
  `review_time`  INT(11)      DEFAULT 24,
  `external_url` VARCHAR(255) DEFAULT '',
  `country`      VARCHAR(10)  DEFAULT '',
  `type`         TINYINT(1)   DEFAULT 1,
  `proof_label`  VARCHAR(120) DEFAULT 'Transaction ID / Screenshot',
  `created_at`   INT(11)      DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `custom_payment_orders` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11) UNSIGNED NOT NULL,
  `gateway_id`  INT(11) UNSIGNED NOT NULL,
  `type`        VARCHAR(20)  DEFAULT 'credits',
  `package_id`  INT(11)      DEFAULT 0,
  `amount`      DECIMAL(10,2) DEFAULT 0,
  `currency`    VARCHAR(10)  DEFAULT 'USD',
  `proof`       TEXT         DEFAULT '',
  `proof_image` VARCHAR(255) DEFAULT '',
  `status`      VARCHAR(20)  DEFAULT 'pending',
  `reviewed_by` INT(11)      DEFAULT 0,
  `review_note` TEXT         DEFAULT '',
  `time`        INT(11)      DEFAULT 0,
  `reviewed_at` INT(11)      DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cpo_user`    FOREIGN KEY (`user_id`)    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cpo_gateway` FOREIGN KEY (`gateway_id`) REFERENCES `custom_payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat_locks` (
  `id`               INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_key` VARCHAR(60) NOT NULL,
  `moderator_id`     INT(11) UNSIGNED NOT NULL,
  `locked_at`        INT(11) DEFAULT 0,
  `expires_at`       INT(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_locks_conv` (`conversation_key`),
  CONSTRAINT `fk_cl_moderator` FOREIGN KEY (`moderator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`         INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11) UNSIGNED NOT NULL,
  `endpoint`   TEXT        NOT NULL,
  `p256dh`     TEXT        NOT NULL,
  `auth`       VARCHAR(60) NOT NULL,
  `created_at` INT(11)     DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── ADD MISSING COLUMNS TO EXISTING TABLES ──────────────────

-- photos table: add flagging columns if not present
ALTER TABLE `photos`
  ADD COLUMN IF NOT EXISTS `flagged`     TINYINT(1)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `flag_reason` VARCHAR(200) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `main`        TINYINT(1)  DEFAULT 0;

-- notifications: add link column
ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `link` VARCHAR(255) DEFAULT '';

-- orders: add stripe session + credits columns
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `stripe_session_id` VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS `credits`            INT(11)      DEFAULT 0;

-- messages: ensure from/to style column exists
-- (old site may use `uid1`/`uid2` — check and rename if needed)

-- ─── BUMP ADMIN LEVELS (old admin=1 → new admin=2) ───────────
-- Uncomment and run this ONCE if your old admins have admin=1:
-- UPDATE `users` SET `admin` = 2 WHERE `admin` = 1 AND `fake` = 0;

-- ─── INDEXES (optional but recommended for performance) ───────
ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_country_code` (`country_code`),
  ADD INDEX IF NOT EXISTS `idx_users_fake`         (`fake`),
  ADD INDEX IF NOT EXISTS `idx_users_premium`      (`premium`),
  ADD INDEX IF NOT EXISTS `idx_users_banned`       (`banned`),
  ADD INDEX IF NOT EXISTS `idx_users_last_access`  (`last_access`);

-- ─── CLEAR STORED FAVICON OVERRIDE ──────────────────────────
-- Removes any custom favicon URL stored in the DB so the new
-- /favicon.svg file is used instead of the old uploaded image.
DELETE FROM `site_config` WHERE `key` = 'branding_favicon';
