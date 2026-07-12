-- 所有者認可の成功と拒否を、入力内容や秘密情報を含めずに記録する。
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_user_id` CHAR(36) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `resource_type` VARCHAR(100) NOT NULL,
    `resource_id` VARCHAR(100) NOT NULL,
    `outcome` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    -- 利用者の操作履歴を時系列で確認する検索を速くする。
    INDEX `audit_logs_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    -- 対象データに対する操作履歴を時系列で確認する検索を速くする。
    INDEX `audit_logs_resource_type_resource_id_created_at_idx`(`resource_type`, `resource_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 監査ログの操作ユーザーが存在することを保証し、ログの意図しない削除を防止する。
ALTER TABLE `audit_logs`
    ADD CONSTRAINT `audit_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
