import { randomUUID } from 'node:crypto';
import type { SkillSettingsRepository } from '../../domain/skill-settings/skill-settings.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
/** Prismaで利用者ごとの分類とレベル定義を保存する。 */
export class PrismaSkillSettingsRepository implements SkillSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async getOwned(userId: string) {
    const [categories, levels] = await Promise.all([
      this.prisma.skillCategory.findMany({
        where: { userId },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.skillLevelDefinition.findMany({
        where: { userId },
        orderBy: { level: 'asc' },
      }),
    ]);
    return { categories, levels };
  }
  async createCategory(userId: string, name: string, displayOrder: number) {
    return this.prisma.skillCategory.create({
      data: { id: randomUUID(), userId, name, displayOrder },
    });
  }
  async updateCategory(
    userId: string,
    id: string,
    input: { name: string; displayOrder: number; isActive: boolean },
  ) {
    const found = await this.prisma.skillCategory.findFirst({
      where: { id, userId },
    });
    return found
      ? this.prisma.skillCategory.update({ where: { id }, data: input })
      : null;
  }
  async updateLevel(
    userId: string,
    level: number,
    input: { name: string; description: string },
  ) {
    const found = await this.prisma.skillLevelDefinition.findFirst({
      where: { userId, level },
    });
    return found
      ? this.prisma.skillLevelDefinition.update({
          where: { id: found.id },
          data: input,
        })
      : null;
  }
}
