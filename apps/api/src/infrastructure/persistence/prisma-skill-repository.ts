import { randomUUID } from 'node:crypto';
import type {
  Skill,
  SkillInput,
  SkillRepository,
} from '../../domain/skill/skill.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
/** Prismaで所有者ごとのスキルをMySQLへ保存する。 */
export class PrismaSkillRepository implements SkillRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async listOwned(userId: string): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      where: { userId, archivedAt: null },
      orderBy: { name: 'asc' },
    }) as Promise<Skill[]>;
  }
  async findOwned(userId: string, id: string): Promise<Skill | null> {
    return this.prisma.skill.findFirst({
      where: { id, userId, archivedAt: null },
    }) as Promise<Skill | null>;
  }
  async createOwned(userId: string, input: SkillInput): Promise<Skill> {
    return this.prisma.skill.create({
      data: { ...input, id: randomUUID(), userId },
    }) as Promise<Skill>;
  }
  async updateOwned(
    userId: string,
    id: string,
    input: SkillInput,
  ): Promise<Skill | null> {
    return (await this.findOwned(userId, id))
      ? (this.prisma.skill.update({
          where: { id },
          data: input,
        }) as Promise<Skill>)
      : null;
  }
  async archiveOwned(userId: string, id: string) {
    return (
      (
        await this.prisma.skill.updateMany({
          where: { id, userId, archivedAt: null },
          data: { archivedAt: new Date() },
        })
      ).count === 1
    );
  }
  async categoryIsOwnedAndActive(userId: string, categoryId: string) {
    return Boolean(
      await this.prisma.skillCategory.findFirst({
        where: { id: categoryId, userId, isActive: true },
      }),
    );
  }
}
