-- 目標を達成するまでの中間地点と、各項目の期限・重み・状態を管理できるようにする。
CREATE TABLE `milestones` (
    `id` CHAR(36) NOT NULL,
    `goal_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `due_date` DATE NOT NULL,
    `completion_condition` TEXT NOT NULL,
    `weight` DECIMAL(8, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `completed_date` DATE NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `milestones_goal_id_status_due_date_idx`(`goal_id`, `status`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 親目標が削除された場合は、親を失うマイルストーンも一緒に削除する。
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_goal_id_fkey` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
