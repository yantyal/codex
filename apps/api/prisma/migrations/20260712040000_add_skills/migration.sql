-- 利用者ごとのスキル、現在レベル、目標レベル、判定基準を保存する。
CREATE TABLE `skills` (
    `id` CHAR(36) NOT NULL, `user_id` CHAR(36) NOT NULL, `category_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL, `current_level` INTEGER NOT NULL, `target_level` INTEGER NOT NULL,
    `criteria` TEXT NOT NULL, `notes` TEXT NOT NULL, `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `skills_user_id_category_id_name_key`(`user_id`, `category_id`, `name`),
    INDEX `skills_user_id_current_level_target_level_idx`(`user_id`, `current_level`, `target_level`),
    CONSTRAINT `skills_current_level_check` CHECK (`current_level` BETWEEN 1 AND 5),
    CONSTRAINT `skills_target_level_check` CHECK (`target_level` BETWEEN 1 AND 5), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 利用者削除時だけスキルを削除し、使用中分類の物理削除は防止する。
ALTER TABLE `skills` ADD CONSTRAINT `skills_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `skills` ADD CONSTRAINT `skills_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `skill_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
