-- 利用者がキャリア目標までの計画を期間と表示順で管理できるようにする。
CREATE TABLE `roadmap_items` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `career_goal_id` CHAR(36) NOT NULL,
    `skill_id` CHAR(36) NULL,
    `name` VARCHAR(200) NOT NULL,
    `planned_start_date` DATE NOT NULL,
    `planned_end_date` DATE NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `priority` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `progress_rate` INTEGER NOT NULL DEFAULT 0,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `roadmap_items_user_id_planned_start_date_sort_order_idx`(`user_id`, `planned_start_date`, `sort_order`),
    INDEX `roadmap_items_career_goal_id_idx`(`career_goal_id`),
    INDEX `roadmap_items_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者またはキャリア目標を削除した場合は、その計画項目も一緒に削除する。
ALTER TABLE `roadmap_items` ADD CONSTRAINT `roadmap_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `roadmap_items` ADD CONSTRAINT `roadmap_items_career_goal_id_fkey` FOREIGN KEY (`career_goal_id`) REFERENCES `career_goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- スキルは任意項目のため、削除された場合は関連だけを未選択へ戻す。
ALTER TABLE `roadmap_items` ADD CONSTRAINT `roadmap_items_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
