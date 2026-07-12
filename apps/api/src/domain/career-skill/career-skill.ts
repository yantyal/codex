export type SkillGap = {
  skillId: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
};
export interface CareerSkillRepository {
  replaceOwnedLinks(
    userId: string,
    careerGoalId: string,
    skillIds: string[],
  ): Promise<boolean>;
  listOwnedGaps(
    userId: string,
    careerGoalId: string,
  ): Promise<SkillGap[] | null>;
}
