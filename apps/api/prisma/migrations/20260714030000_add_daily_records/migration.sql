-- 利用者が目標に対する日々の活動、時間、進捗、学びを記録できるようにする。
CREATE TABLE `daily_records` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `goal_id` CHAR(36) NOT NULL,
    `milestone_id` CHAR(36) NULL,
    `activity_date` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `work_minutes` INTEGER NOT NULL,
    `progress_amount` DECIMAL(15, 2) NULL,
    `learned` TEXT NOT NULL,
    `issue` TEXT NOT NULL,
    `next_action` TEXT NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `daily_records_user_id_activity_date_idx`(`user_id`, `activity_date`),
    INDEX `daily_records_goal_id_activity_date_idx`(`goal_id`, `activity_date`),
    INDEX `daily_records_milestone_id_idx`(`milestone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者または目標の削除時は実績も削除し、任意のマイルストーン削除時は未選択へ戻す。
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `daily_records` ADD CONSTRAINT `daily_records_milestone_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
