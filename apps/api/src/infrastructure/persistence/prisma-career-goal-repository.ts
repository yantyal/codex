import { randomUUID } from 'node:crypto';
import type {
  CareerGoal,
  CareerGoalInput,
  CareerGoalRepository,
} from '../../domain/career/career-goal.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って所有者単位のキャリア目標をMySQLへ保存する。 */
export class PrismaCareerGoalRepository implements CareerGoalRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async listOwned(userId: string): Promise<CareerGoal[]> {
    return this.prisma.careerGoal.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    }) as Promise<CareerGoal[]>;
  }
  async findOwned(userId: string, id: string): Promise<CareerGoal | null> {
    return this.prisma.careerGoal.findFirst({
      where: { id, userId, archivedAt: null },
    }) as Promise<CareerGoal | null>;
  }
  async createOwned(
    userId: string,
    input: CareerGoalInput,
  ): Promise<CareerGoal> {
    return this.prisma.careerGoal.create({
      data: { ...input, id: randomUUID(), userId },
    }) as Promise<CareerGoal>;
  }
  async updateOwned(
    userId: string,
    id: string,
    input: CareerGoalInput,
  ): Promise<CareerGoal | null> {
    const found = await this.findOwned(userId, id);
    if (!found) return null;
    return this.prisma.careerGoal.update({
      where: { id },
      data: input,
    }) as Promise<CareerGoal>;
  }
  async archiveOwned(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.careerGoal.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }
}
