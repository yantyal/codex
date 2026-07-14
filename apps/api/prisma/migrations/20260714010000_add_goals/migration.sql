-- 利用者が測定方法ごとの実行目標とSMART判定に必要な情報を管理できるようにする。
CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `roadmap_item_id` CHAR(36) NULL,
    `evaluation_period_id` CHAR(36) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `calculation_type` VARCHAR(30) NOT NULL,
    `start_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `completion_condition` TEXT NOT NULL,
    `measurement_method` TEXT NOT NULL,
    `target_value` DECIMAL(15, 2) NULL,
    `current_value` DECIMAL(15, 2) NULL,
    `unit` VARCHAR(50) NOT NULL,
    `planned_days` INTEGER NULL,
    `manual_progress` INTEGER NULL,
    `manual_reason` TEXT NOT NULL,
    `priority` VARCHAR(20) NOT NULL,
    `weight` DECIMAL(8, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `goals_user_id_status_due_date_idx`(`user_id`, `status`, `due_date`),
    INDEX `goals_roadmap_item_id_idx`(`roadmap_item_id`),
    INDEX `goals_evaluation_period_id_idx`(`evaluation_period_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者削除時は所有目標を削除し、任意の関連データ削除時は目標を残して未選択へ戻す。
ALTER TABLE `goals` ADD CONSTRAINT `goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `goals` ADD CONSTRAINT `goals_roadmap_item_id_fkey` FOREIGN KEY (`roadmap_item_id`) REFERENCES `roadmap_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `goals` ADD CONSTRAINT `goals_evaluation_period_id_fkey` FOREIGN KEY (`evaluation_period_id`) REFERENCES `evaluation_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
