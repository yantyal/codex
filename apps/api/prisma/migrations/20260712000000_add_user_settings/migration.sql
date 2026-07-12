-- ログインする利用者と、利用者を識別する基本情報を保存する。
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    -- 同じメールアドレスで複数の利用者が登録されることを防止する。
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者ごとに変更できるスキル分類を保存する。
CREATE TABLE `skill_categories` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    -- 有効な分類を表示順に取得する検索を速くする。
    INDEX `skill_categories_user_id_is_active_display_order_idx`(`user_id`, `is_active`, `display_order`),
    -- 同じ利用者の中で分類名が重複することを防止する。
    UNIQUE INDEX `skill_categories_user_id_name_key`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者ごとにレベル1から5の名称と説明を保存する。
CREATE TABLE `skill_level_definitions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `level` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    -- 利用者のレベル定義をまとめて取得する検索を速くする。
    INDEX `skill_level_definitions_user_id_idx`(`user_id`),
    -- 同じ利用者が同じレベルを複数登録することを防止する。
    UNIQUE INDEX `skill_level_definitions_user_id_level_key`(`user_id`, `level`),
    -- MVPで扱うレベルを1から5の範囲に制限する。
    CONSTRAINT `skill_level_definitions_level_check` CHECK (`level` BETWEEN 1 AND 5),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 分類を所有する利用者が存在することを保証する。
-- 利用者を削除した場合は、その利用者だけの分類も同時に削除する。
ALTER TABLE `skill_categories`
    ADD CONSTRAINT `skill_categories_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- レベル定義を所有する利用者が存在することを保証する。
-- 利用者を削除した場合は、その利用者だけのレベル定義も同時に削除する。
ALTER TABLE `skill_level_definitions`
    ADD CONSTRAINT `skill_level_definitions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
