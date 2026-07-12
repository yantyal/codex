-- キャリア目標に必要なスキルを重複なく関連付ける。
CREATE TABLE `career_goal_skills` (
    `career_goal_id` CHAR(36) NOT NULL,
    `skill_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `career_goal_skills_skill_id_idx`(`skill_id`),
    PRIMARY KEY (`career_goal_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 目標削除時は関連を削除し、関連中スキルの物理削除は防止する。
ALTER TABLE `career_goal_skills` ADD CONSTRAINT `career_goal_skills_career_goal_id_fkey` FOREIGN KEY (`career_goal_id`) REFERENCES `career_goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `career_goal_skills` ADD CONSTRAINT `career_goal_skills_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
