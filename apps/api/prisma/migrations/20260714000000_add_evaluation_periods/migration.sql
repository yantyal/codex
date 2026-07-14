-- 利用者が人事評価の対象期間と重点テーマを管理できるようにする。
CREATE TABLE `evaluation_periods` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `theme` TEXT NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `evaluation_periods_user_id_start_date_end_date_idx`(`user_id`, `start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者を削除した場合は、その利用者だけが所有する評価期間も一緒に削除する。
ALTER TABLE `evaluation_periods` ADD CONSTRAINT `evaluation_periods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
