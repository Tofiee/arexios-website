-- --------------------------------------------------------
-- Sunucu:                       127.0.0.1
-- Sunucu sürümü:                8.0.45 - MySQL Community Server - GPL
-- Sunucu İşletim Sistemi:       Win64
-- HeidiSQL Sürüm:               12.16.0.7229
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- arexios_db için veritabanı yapısı dökülüyor
CREATE DATABASE IF NOT EXISTS `arexios_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `arexios_db`;

-- tablo yapısı dökülüyor arexios_db.complaints
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `complaint_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_steam_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_complaints_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.complaints: ~2 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `complaints` (`id`, `user_id`, `complaint_type`, `target_name`, `target_steam_id`, `message`, `status`, `created_at`, `updated_at`) VALUES
	(1, 0, 'server', NULL, NULL, 'deneme', 'pending', '2026-04-12 00:50:07', NULL),
	(2, 0, 'server', NULL, NULL, 'deneme', 'pending', '2026-04-12 00:50:09', NULL);

-- tablo yapısı dökülüyor arexios_db.server_admins
CREATE TABLE IF NOT EXISTS `server_admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `steam_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ix_server_admins_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.server_admins: ~0 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `server_admins` (`id`, `username`, `steam_id`, `avatar_url`, `is_active`, `created_at`) VALUES
	(1, 'Tofie', '76561198116871167', NULL, 1, '2026-04-12 02:14:23');

-- tablo yapısı dökülüyor arexios_db.skin_categories
CREATE TABLE IF NOT EXISTS `skin_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `ix_skin_categories_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.skin_categories: ~2 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `skin_categories` (`id`, `name`, `slug`, `is_active`, `created_at`) VALUES
	(2, 'AWP', 'awp', 1, '2026-04-13 22:32:30');

-- tablo yapısı dökülüyor arexios_db.skins
CREATE TABLE IF NOT EXISTS `skins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` int NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_skins_id` (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `skins_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `skin_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.skins: ~0 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `skins` (`id`, `name`, `image_url`, `price`, `is_active`, `created_at`, `updated_at`, `category_id`) VALUES
	(1, 'Asiimov', 'https://toppng.com/uploads/preview/1600-x-342-13-cs-go-awp-asiimov-115629374274flsydpwq9.png', 100, 1, '2026-04-13 22:57:02', NULL, 2);

-- tablo yapısı dökülüyor arexios_db.support_messages
CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ix_support_messages_session_id` (`session_id`),
  KEY `ix_support_messages_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.support_messages: ~0 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `support_messages` (`id`, `session_id`, `sender_type`, `sender_name`, `message`, `is_read`, `created_at`) VALUES
	(77, 67, 'user', 'Misafir', '🎮 SKIN SATIN ALMA TALEBİ\n\n📦 Skin: Asiimov\n💰 Fiyat: 100 TL\n👤 Oyuncu: Deneme\n💬 Discord: Belirtilmedi\n📝 Not: Yok', 0, '2026-04-13 23:17:52');

-- tablo yapısı dökülüyor arexios_db.support_sessions
CREATE TABLE IF NOT EXISTS `support_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_admin_id` int DEFAULT NULL,
  `assigned_admin_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_support_sessions_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.support_sessions: ~7 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `support_sessions` (`id`, `user_id`, `user_name`, `user_email`, `status`, `assigned_admin_id`, `assigned_admin_name`, `created_at`, `updated_at`) VALUES
	(48, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-13 00:50:09', NULL),
	(52, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-13 11:52:28', NULL),
	(57, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-13 12:28:19', NULL),
	(59, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-13 12:28:56', NULL),
	(67, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-13 14:56:22', NULL),
	(68, NULL, 'Anıl MENTEŞ', 'anilmentess@gmail.com', 'waiting', NULL, NULL, '2026-04-13 16:00:02', NULL),
	(69, NULL, 'Misafir', '', 'waiting', NULL, NULL, '2026-04-14 00:16:20', NULL);

-- tablo yapısı dökülüyor arexios_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `steam_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `discord_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discord_username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_provider_id` (`provider_id`),
  KEY `ix_users_id` (`id`),
  KEY `ix_users_provider` (`provider`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- arexios_db.users: ~1 rows (yaklaşık) tablosu için veriler indiriliyor
INSERT INTO `users` (`id`, `provider`, `provider_id`, `email`, `username`, `avatar_url`, `steam_id`, `role`, `is_active`, `created_at`, `discord_id`, `discord_username`) VALUES
	(1, 'google', '106108660317814261500', 'anilmentess@gmail.com', 'Anıl MENTEŞ', 'https://lh3.googleusercontent.com/a/ACg8ocLWeXCkZMT8TSvtI8F-FQoYnro5yBj3h9_VW8rnP3_-Q8EY1tV2=s96-c', '76561198116871167', 'member', 1, '2026-04-08 15:10:28', '199494143947309056', 'tofie_');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
