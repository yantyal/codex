-- 利用者ごとの中長期キャリア目標を保存する。
CREATE TABLE `career_goals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `target_role` VARCHAR(200) NOT NULL,
    `due_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `current_state` TEXT NOT NULL,
    `target_state` TEXT NOT NULL,
    `priority` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `career_goals_user_id_status_due_date_idx`(`user_id`, `status`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者を削除した場合は、その利用者だけのキャリア目標も削除する。
ALTER TABLE `career_goals` ADD CONSTRAINT `career_goals_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
