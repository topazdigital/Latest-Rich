CREATE DATABASE IF NOT EXISTS dating_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dating_app;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting` varchar(200) NOT NULL,
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`setting`, `setting_val`) VALUES
('siteName', 'Dating Site'),
('desktopTheme', 'default'),
('desktopThemePreset', 'default'),
('mobileTheme', 'default'),
('emailTheme', 'default'),
('landingTheme', 'default'),
('landingThemePreset', 'default'),
('currentVersion', '4.4.4.2'),
('license', ''),
('licenseError', ''),
('fakeUserLimit', '0'),
('fakeUserUsage', '0'),
('premium', 'No'),
('domainsLimit', '1'),
('domainsUsage', '1'),
('updateAvailable', 'No'),
('checkUpdate', '0'),
('title', 'Dating Site'),
('description', 'A dating site'),
('keywords', 'dating, singles, love'),
('forceSSL', 'No'),
('registerType', 'email'),
('chatEnabled', 'Yes'),
('profileApproval', 'No'),
('photoApproval', 'No')
ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val);

CREATE TABLE IF NOT EXISTS `plugins_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plugin` varchar(200) NOT NULL,
  `setting` varchar(200) NOT NULL,
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `plugins_settings` (`plugin`, `setting`, `setting_val`) VALUES
('settings', 'siteName', 'Dating Site'),
('settings', 'siteEmail', 'admin@localhost'),
('settings', 'currency', 'USD'),
('settings', 'defaultLang', '1'),
('settings', 'browserLanguage', 'No'),
('settings', 'timezone', 'UTC'),
('settings', 'forceSSL', 'No'),
('settings', 'registerType', 'email'),
('pusher', 'key', ''),
('pusher', 'secret', ''),
('pusher', 'id', ''),
('pusher', 'cluster', 'mt1'),
('autoRegister', 'enabled', 'No'),
('autoRegister', 'guestDefaultName', 'Guest'),
('autoRegister', 'guestDefaultPswd', 'guest123'),
('autoRegister', 'guestCustomOneUrl', '')
ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val);

CREATE TABLE IF NOT EXISTS `plugins_settings_values` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plugin` varchar(200) NOT NULL,
  `setting` varchar(200) NOT NULL,
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `plugins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plugin` varchar(200) NOT NULL,
  `name` varchar(200) NOT NULL,
  `enabled` varchar(10) DEFAULT 'No',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting` varchar(200) NOT NULL,
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `config` (`setting`, `setting_val`) VALUES
('title', 'Dating Site'),
('description', 'A dating site'),
('keywords', 'dating')
ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val);

CREATE TABLE IF NOT EXISTS `languages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `language` varchar(100) NOT NULL,
  `code` varchar(10) DEFAULT 'en',
  `default` int(1) DEFAULT 0,
  `flag` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `languages` (`id`, `language`, `code`, `default`) VALUES
(1, 'English', 'en', 1)
ON DUPLICATE KEY UPDATE language = VALUES(language);

CREATE TABLE IF NOT EXISTS `app_lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `text` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `text` text,
  `key` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `seo_lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `page` varchar(200) DEFAULT '',
  `title` text,
  `description` text,
  `keywords` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `key` varchar(200) DEFAULT '',
  `text` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `landing_lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `theme` varchar(200) DEFAULT '',
  `preset` varchar(200) DEFAULT '',
  `key` varchar(200) DEFAULT '',
  `text` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `theme_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `theme` varchar(200) NOT NULL,
  `setting` varchar(200) NOT NULL,
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `theme_preset` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `theme` varchar(200) NOT NULL,
  `preset` varchar(200) NOT NULL,
  `theme_settings` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `theme_preset` (`theme`, `preset`, `theme_settings`) VALUES
('default', 'default', '{}'),
('default', 'default', '{}')
ON DUPLICATE KEY UPDATE theme_settings = VALUES(theme_settings);

CREATE TABLE IF NOT EXISTS `config_themes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `folder` varchar(200) NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` varchar(100) DEFAULT 'desktop',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `config_themes` (`folder`, `name`, `type`) VALUES
('default', 'Default', 'desktop'),
('default', 'Default', 'mobile'),
('default', 'Default', 'landing'),
('default', 'Default', 'email')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT '',
  `email` varchar(200) DEFAULT '',
  `pass` varchar(200) DEFAULT '',
  `age` int(3) DEFAULT 18,
  `gender` int(2) DEFAULT 1,
  `city` varchar(200) DEFAULT '',
  `country` varchar(200) DEFAULT '',
  `lat` float DEFAULT 0,
  `lng` float DEFAULT 0,
  `looking` int(2) DEFAULT 2,
  `lang` int(11) DEFAULT 1,
  `join_date` varchar(100) DEFAULT '',
  `join_date_time` int(11) DEFAULT 0,
  `bio` text,
  `s_gender` int(2) DEFAULT 2,
  `s_age` varchar(20) DEFAULT '18-99',
  `verified` int(1) DEFAULT 0,
  `credits` int(11) DEFAULT 0,
  `admin` int(2) DEFAULT 0,
  `moderator` int(11) DEFAULT 0,
  `ip` varchar(100) DEFAULT '',
  `last_access` int(11) DEFAULT 0,
  `online_day` int(11) DEFAULT 0,
  `password` varchar(200) DEFAULT '',
  `username` varchar(200) DEFAULT '',
  `facebook_id` varchar(200) DEFAULT '',
  `instagram_id` varchar(200) DEFAULT '',
  `twitter_id` varchar(200) DEFAULT '',
  `total` int(11) DEFAULT 0,
  `banned` int(1) DEFAULT 0,
  `membership` varchar(100) DEFAULT 'free',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u_id` int(11) NOT NULL,
  `photo` varchar(500) DEFAULT '',
  `profile` int(1) DEFAULT 0,
  `thumb` varchar(500) DEFAULT '',
  `approved` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_premium` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `premium` int(1) DEFAULT 0,
  `expire` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `messages` int(11) DEFAULT 0,
  `likes` int(11) DEFAULT 0,
  `matches` int(11) DEFAULT 0,
  `visitors` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_extended` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `data` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_videocall` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u_id` int(11) NOT NULL,
  `token` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_visits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) NOT NULL,
  `u2` int(11) NOT NULL,
  `timeago` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visit_unique` (`u1`,`u2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) NOT NULL,
  `u2` int(11) NOT NULL,
  `timeago` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) NOT NULL,
  `u2` int(11) NOT NULL,
  `message` text,
  `time` int(11) DEFAULT 0,
  `read` int(1) DEFAULT 0,
  `from` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `a_type` varchar(100) DEFAULT '',
  `message` text,
  `title` text,
  `time` int(11) DEFAULT 0,
  `uid` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `genders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) NOT NULL,
  `gender` varchar(100) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `genders` (`lang_id`, `gender`) VALUES
(1, 'Male'),
(1, 'Female')
ON DUPLICATE KEY UPDATE gender = VALUES(gender);

CREATE TABLE IF NOT EXISTS `interests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `interest` varchar(200) DEFAULT '',
  `lang_id` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT '',
  `price` float DEFAULT 0,
  `type` varchar(100) DEFAULT '',
  `days` int(11) DEFAULT 0,
  `credits` int(11) DEFAULT 0,
  `featured` int(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT 'Free',
  `type` varchar(100) DEFAULT 'free',
  `enabled` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `accounts` (`name`, `type`, `enabled`) VALUES
('Free', 'free', 1),
('Premium', 'premium', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS `accounts_basic` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `feature` varchar(200) DEFAULT '',
  `val` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `accounts_premium` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `feature` varchar(200) DEFAULT '',
  `val` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cron` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cron` varchar(200) DEFAULT '',
  `cron_last_run` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `cron` (`cron`, `cron_last_run`) VALUES
('cron', 0)
ON DUPLICATE KEY UPDATE cron = VALUES(cron);

CREATE TABLE IF NOT EXISTS `client` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `client` (`client`) VALUES ('{}');

CREATE TABLE IF NOT EXISTS `moderation_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `moderation` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `moderators_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting` varchar(200) DEFAULT '',
  `setting_val` varchar(200) DEFAULT '',
  `moderator` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `reason` text,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `amount` float DEFAULT 0,
  `type` varchar(100) DEFAULT '',
  `time` int(11) DEFAULT 0,
  `status` varchar(100) DEFAULT '',
  `gateway` varchar(100) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Additional tables required by core.php
ALTER TABLE `languages` ADD COLUMN IF NOT EXISTS `visible` int(1) DEFAULT 1;
ALTER TABLE `languages` ADD COLUMN IF NOT EXISTS `prefix` varchar(10) DEFAULT 'en';
ALTER TABLE `languages` ADD COLUMN IF NOT EXISTS `name` varchar(100) DEFAULT 'English';
UPDATE `languages` SET `visible`=1, `prefix`='en', `name`='English' WHERE id=1;

ALTER TABLE `users_notifications` ADD COLUMN IF NOT EXISTS `fan` varchar(20) DEFAULT '1,0,1';
ALTER TABLE `users_notifications` ADD COLUMN IF NOT EXISTS `match_me` varchar(20) DEFAULT '1,0,1';
ALTER TABLE `users_notifications` ADD COLUMN IF NOT EXISTS `near_me` varchar(20) DEFAULT '1,0,1';
ALTER TABLE `users_notifications` ADD COLUMN IF NOT EXISTS `message` varchar(20) DEFAULT '1,0,1';

CREATE TABLE IF NOT EXISTS `config_credits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `credits` int(11) DEFAULT 0,
  `price` float DEFAULT 0,
  `name` varchar(200) DEFAULT '',
  `featured` int(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_premium` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `days` int(11) DEFAULT 0,
  `price` float DEFAULT 0,
  `name` varchar(200) DEFAULT '',
  `featured` int(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `feature` varchar(200) DEFAULT '',
  `price` float DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` int(2) DEFAULT 1,
  `data` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_email` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `host` varchar(200) DEFAULT '',
  `port` int(5) DEFAULT 587,
  `username` varchar(200) DEFAULT '',
  `password` varchar(200) DEFAULT '',
  `from_email` varchar(200) DEFAULT '',
  `from_name` varchar(200) DEFAULT '',
  `type` varchar(50) DEFAULT 'smtp',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `config_email` (`host`,`port`,`username`,`password`,`from_email`,`from_name`,`type`) VALUES ('',587,'','','admin@localhost','Dating Site','smtp') ON DUPLICATE KEY UPDATE id=id;

CREATE TABLE IF NOT EXISTS `config_genders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gender` varchar(100) DEFAULT '',
  `lang_id` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_profile_questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question` varchar(500) DEFAULT '',
  `type` varchar(100) DEFAULT 'select',
  `lang_id` int(11) DEFAULT 1,
  `order` int(11) DEFAULT 0,
  `enabled` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_profile_answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) DEFAULT 0,
  `answer` varchar(500) DEFAULT '',
  `lang_id` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_withdraw` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `method` varchar(200) DEFAULT '',
  `enabled` int(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `config_app` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting` varchar(200) DEFAULT '',
  `setting_val` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `theme_preset_fonts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `preset` varchar(200) DEFAULT '',
  `theme` varchar(200) DEFAULT '',
  `font` varchar(200) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_profile_questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `question_id` int(11) DEFAULT 0,
  `answer_id` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_interest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u_id` int(11) DEFAULT 0,
  `i_id` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_chat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `last_message` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_online_day` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `day` varchar(20) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_story` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `album_id` int(11) DEFAULT 0,
  `photo` varchar(500) DEFAULT '',
  `thumb` varchar(500) DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_story_albums` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `name` varchar(200) DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_story_purchase` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `story_id` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users_withdraw` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `amount` float DEFAULT 0,
  `method` varchar(200) DEFAULT '',
  `status` varchar(100) DEFAULT 'pending',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `interest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT '',
  `icon` varchar(200) DEFAULT '',
  `count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gifts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT '',
  `image` varchar(500) DEFAULT '',
  `price` int(11) DEFAULT 0,
  `enabled` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spotlight` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `expire` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) DEFAULT '',
  `code` text,
  `position` varchar(100) DEFAULT '',
  `enabled` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `black_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(200) DEFAULT '',
  `ip` varchar(100) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `blocked_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `photo` varchar(500) DEFAULT '',
  `uid` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `message` text,
  `time` int(11) DEFAULT 0,
  `read` int(1) DEFAULT 0,
  `from` int(11) DEFAULT 0,
  `type` varchar(50) DEFAULT 'text',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `dating` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `status` int(1) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(500) DEFAULT '',
  `body` text,
  `time` int(11) DEFAULT 0,
  `uid` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT 'pending',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fake_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message` text,
  `lang_id` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `photo` varchar(500) DEFAULT '',
  `thumb` varchar(500) DEFAULT '',
  `time` int(11) DEFAULT 0,
  `approved` int(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `photos_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `photo_id` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `site_lang` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lang_id` int(11) DEFAULT 1,
  `key` varchar(200) DEFAULT '',
  `text` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `videocall` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `token` varchar(200) DEFAULT '',
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) DEFAULT 0,
  `data` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `matches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `u1` int(11) DEFAULT 0,
  `u2` int(11) DEFAULT 0,
  `time` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fix landing theme settings
UPDATE `settings` SET `setting_val`='landing1' WHERE `setting`='landingTheme';
INSERT IGNORE INTO `theme_preset` (`theme`, `preset`, `theme_settings`) VALUES ('landing1', 'default', '{"logo":{"val":"/themes/landing1/img/logo.png"},"favicon":{"val":"/themes/default/favicon.ico"},"theme":{"val":"landing1"},"form_bg":{"val":""},"form_btn_bg":{"val":""},"bg_image":{"val":"/themes/landing1/img/bg.jpg"},"header_bg":{"val":"rgba(0,0,0,0.5)"},"header_color":{"val":"#ffffff"},"title_color":{"val":"#ffffff"},"stats_bg":{"val":"#f9f9f9"},"stats_color":{"val":"#333333"},"footer_bg":{"val":"#222222"},"footer_color":{"val":"#cccccc"}}');

-- Default English site language strings
INSERT IGNORE INTO `site_lang` (`lang_id`, `key`, `text`) VALUES
(1, '8', 'Sign Up'),
(1, '10', 'Email'),
(1, '11', 'Password'),
(1, '13', 'Login'),
(1, '27', 'Full Name'),
(1, '31', 'Gender'),
(1, '42', 'I agree to the'),
(1, '43', 'Terms and Conditions'),
(1, '44', 'and'),
(1, '45', 'Privacy Policy'),
(1, '272', 'Day'),
(1, '273', 'Month'),
(1, '274', 'Year'),
(1, '331', 'Username'),
(1, '529', 'I am'),
(1, '530', 'Looking for');

-- Default English landing page text
INSERT IGNORE INTO `landing_lang` (`lang_id`, `theme`, `preset`, `key`, `text`) VALUES
(1, 'landing1', 'default', '1', 'Home'),
(1, 'landing1', 'default', '2', 'Sign In'),
(1, 'landing1', 'default', '3', 'Find Your Perfect Match'),
(1, 'landing1', 'default', '4', 'Join thousands of singles finding love every day'),
(1, 'landing1', 'default', '5', 'Create your free account'),
(1, 'landing1', 'default', '6', 'Get Started'),
(1, 'landing1', 'default', '7', 'How it works'),
(1, 'landing1', 'default', '8', 'About Us');

-- Default SEO metadata
INSERT IGNORE INTO `seo_lang` (`lang_id`, `page`, `title`, `description`, `keywords`) VALUES
(1, 'landing', 'Dating Site - Find Your Match', 'Join our dating site and find your perfect match today', 'dating, singles, love, match, relationship'),
(1, 'home', 'Home - Dating Site', 'Find your match on our dating site', 'dating, singles, love'),
(1, 'login', 'Login - Dating Site', 'Login to your account', 'dating, login, account'),
(1, 'register', 'Register - Dating Site', 'Create your free account', 'dating, register, signup'),
(1, 'profile', 'Profile - Dating Site', 'View profile', 'dating, profile'),
(1, 'chat', 'Chat - Dating Site', 'Chat with matches', 'dating, chat, messages'),
(1, 'meet', 'Meet - Dating Site', 'Meet new people', 'dating, meet, people'),
(1, 'discover', 'Discover - Dating Site', 'Discover matches', 'dating, discover, matches');

-- Create default admin user (email: admin@localhost, password: admin123)
INSERT IGNORE INTO `users` (`name`, `email`, `pass`, `password`, `username`, `age`, `gender`, `city`, `country`, `join_date`, `join_date_time`, `admin`, `verified`, `credits`, `membership`)
VALUES ('Admin', 'admin@localhost', MD5('admin123'), MD5('admin123'), 'admin', 30, 1, 'New York', 'United States', CURDATE(), UNIX_TIMESTAMP(), 1, 1, 0, 'premium');
