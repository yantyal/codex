import { randomUUID } from 'node:crypto';
import type {
  Milestone,
  MilestoneInput,
  MilestoneRepository,
} from '../../domain/milestone/milestone.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

type StoredMilestone = Omit<Milestone, 'weight'> & { weight: unknown };

/** Prismaを使って所有する目標のマイルストーンをMySQLへ保存する。 */
export class PrismaMilestoneRepository implements MilestoneRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 目標が所有者の有効なマイルストーン方式か確認する。
   * @param userId 目標を所有する利用者ID
   * @param goalId 確認する目標ID
   * @returns マイルストーンを登録できる場合はtrue
   */
  async goalCanUseMilestones(userId: string, goalId: string) {
    return Boolean(
      await this.prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
          calculationType: 'milestone',
          archivedAt: null,
        },
        select: { id: true },
      }),
    );
  }

  /**
   * 所有する目標の有効なマイルストーンを期限順で返す。
   * @param userId 目標を所有する利用者ID
   * @param goalId 一覧を取得する目標ID
   * @returns 所有者と目標が一致するマイルストーンの配列
   */
  async listOwned(userId: string, goalId: string) {
    const values = await this.prisma.milestone.findMany({
      where: { goalId, goal: { userId, archivedAt: null }, archivedAt: null },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    return values.map((value) =>
      this.toDomain(value as unknown as StoredMilestone),
    );
  }

  /**
   * 所有者、目標、IDが一致する有効なマイルストーンを返す。
   * @param userId 目標を所有する利用者ID
   * @param goalId マイルストーンが属する目標ID
   * @param id 取得するマイルストーンID
   * @returns 一致するマイルストーン、またはnull
   */
  async findOwned(userId: string, goalId: string, id: string) {
    const value = await this.prisma.milestone.findFirst({
      where: {
        id,
        goalId,
        goal: { userId, archivedAt: null },
        archivedAt: null,
      },
    });
    return value ? this.toDomain(value as unknown as StoredMilestone) : null;
  }

  /**
   * UUIDを付けて所有する目標へマイルストーンを登録する。
   * @param userId 目標を所有する利用者ID
   * @param input 登録する入力値
   * @returns 登録したマイルストーン
   * @remarks 呼び出し前にサービス層で目標の所有権を確認する。
   */
  async createOwned(_userId: string, input: MilestoneInput) {
    const value = await this.prisma.milestone.create({
      data: { ...input, id: randomUUID() },
    });
    return this.toDomain(value as unknown as StoredMilestone);
  }

  /**
   * 所有者と目標が一致する場合だけマイルストーンを更新する。
   * @param userId 目標を所有する利用者ID
   * @param id 更新するマイルストーンID
   * @param input 更新後の入力値
   * @returns 更新したマイルストーン、またはnull
   */
  async updateOwned(userId: string, id: string, input: MilestoneInput) {
    if (!(await this.findOwned(userId, input.goalId, id))) return null;
    const value = await this.prisma.milestone.update({
      where: { id },
      data: input,
    });
    return this.toDomain(value as unknown as StoredMilestone);
  }

  /**
   * 所有者と目標が一致する場合だけアーカイブ日時を設定する。
   * @param userId 目標を所有する利用者ID
   * @param goalId マイルストーンが属する目標ID
   * @param id アーカイブするマイルストーンID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, goalId: string, id: string) {
    const value = await this.findOwned(userId, goalId, id);
    if (!value) return false;
    await this.prisma.milestone.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return true;
  }

  /**
   * PrismaのDecimal型の重みをAPIで扱いやすいnumberへ変換する。
   * @param stored MySQLから取得したマイルストーン
   * @returns ドメイン層で扱うマイルストーン
   */
  private toDomain(stored: StoredMilestone): Milestone {
    const { weight, ...rest } = stored;
    return { ...rest, weight: Number(weight) };
  }
}
