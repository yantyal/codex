import type { CareerSkillRepository } from '../../domain/career-skill/career-skill.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
/** Prismaで同一所有者の目標とスキルの関連を保存する。 */
export class PrismaCareerSkillRepository implements CareerSkillRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async replaceOwnedLinks(userId: string, goalId: string, skillIds: string[]) {
    const goal = await this.prisma.careerGoal.findFirst({
      where: { id: goalId, userId, archivedAt: null },
    });
    const count = await this.prisma.skill.count({
      where: { id: { in: skillIds }, userId, archivedAt: null },
    });
    if (!goal || count !== skillIds.length) return false;
    await this.prisma.$transaction([
      this.prisma.careerGoalSkill.deleteMany({
        where: { careerGoalId: goalId },
      }),
      this.prisma.careerGoalSkill.createMany({
        data: skillIds.map((skillId) => ({ careerGoalId: goalId, skillId })),
      }),
    ]);
    return true;
  }
  async listOwnedGaps(userId: string, goalId: string) {
    const goal = await this.prisma.careerGoal.findFirst({
      where: { id: goalId, userId, archivedAt: null },
      include: {
        requiredSkills: {
          where: { skill: { userId, archivedAt: null } },
          include: { skill: true },
        },
      },
    });
    return goal
      ? goal.requiredSkills.map(({ skill }) => ({
          skillId: skill.id,
          name: skill.name,
          currentLevel: skill.currentLevel,
          targetLevel: skill.targetLevel,
          gap: skill.targetLevel - skill.currentLevel,
        }))
      : null;
  }
}
