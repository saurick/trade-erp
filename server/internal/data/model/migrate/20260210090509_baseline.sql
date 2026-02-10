-- Create "admin_users" table
CREATE TABLE `admin_users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `level` tinyint NOT NULL DEFAULT 2,
  `menu_permissions` varchar(4096) NOT NULL DEFAULT "",
  `parent_id` bigint NULL,
  `disabled` bool NOT NULL DEFAULT 0,
  `last_login_at` timestamp NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `adminuser_level` (`level`),
  INDEX `adminuser_parent_id` (`parent_id`),
  UNIQUE INDEX `adminuser_username` (`username`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "erp_module_records" table
CREATE TABLE `erp_module_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `module_key` varchar(64) NOT NULL,
  `code` varchar(128) NULL,
  `box` varchar(32) NULL,
  `payload` longtext NOT NULL,
  `created_by_admin_id` bigint NULL,
  `updated_by_admin_id` bigint NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `erpmodulerecord_module_key` (`module_key`),
  INDEX `erpmodulerecord_module_key_code` (`module_key`, `code`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "users" table
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(32) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` tinyint NOT NULL DEFAULT 0,
  `admin_id` bigint NULL,
  `disabled` bool NOT NULL DEFAULT 0,
  `last_login_at` timestamp NULL,
  `points` bigint NOT NULL DEFAULT 0,
  `expires_at` timestamp NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `user_admin_id` (`admin_id`),
  UNIQUE INDEX `user_username` (`username`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
