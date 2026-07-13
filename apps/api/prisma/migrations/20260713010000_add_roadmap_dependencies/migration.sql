-- ロードマップ項目に、先に完了すべき前提項目を重複なく関連付ける。
CREATE TABLE `roadmap_dependencies` (
    `roadmap_item_id` CHAR(36) NOT NULL,
    `prerequisite_item_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `roadmap_dependencies_prerequisite_item_id_idx`(`prerequisite_item_id`),
    PRIMARY KEY (`roadmap_item_id`, `prerequisite_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 項目を削除した場合は、対象側・前提側のどちらの関連も一緒に削除する。
ALTER TABLE `roadmap_dependencies` ADD CONSTRAINT `roadmap_dependencies_roadmap_item_id_fkey` FOREIGN KEY (`roadmap_item_id`) REFERENCES `roadmap_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `roadmap_dependencies` ADD CONSTRAINT `roadmap_dependencies_prerequisite_item_id_fkey` FOREIGN KEY (`prerequisite_item_id`) REFERENCES `roadmap_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
