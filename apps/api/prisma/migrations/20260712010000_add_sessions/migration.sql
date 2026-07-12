-- Cookieへ保存する値そのものではなく、ハッシュ化したセッション情報を保存する。
CREATE TABLE `sessions` (
    `token_hash` CHAR(64) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `csrf_token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    -- 利用者単位でセッションを失効させる検索を速くする。
    INDEX `sessions_user_id_idx`(`user_id`),
    -- 期限切れセッションを定期的に整理する検索を速くする。
    INDEX `sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 利用者を削除した場合は、その利用者のセッションも同時に削除する。
ALTER TABLE `sessions`
    ADD CONSTRAINT `sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
