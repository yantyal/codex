import { randomUUID } from 'node:crypto';
import type {
  Goal,
  GoalInput,
  GoalRepository,
} from '../../domain/goal/goal.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

type StoredGoal = Omit<Goal, 'targetValue' | 'currentValue' | 'weight'> & {
  targetValue: unknown;
  currentValue: unknown;
  weight: unknown;
};

/** Prismaを使って所有者単位の実行目標をMySQLへ保存する。 */
export class PrismaGoalRepository implements GoalRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 所有者の有効な目標を期限、優先度、作成日時の順で返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する目標の配列
   */
  async listOwned(userId: string) {
    const values = await this.prisma.goal.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });
    return values.map((value) => this.toDomain(value as unknown as StoredGoal));
  }

  /**
   * 所有者、ID、有効状態が一致する目標を返す。
   * @param userId ログイン中の利用者ID
   * @param id 参照する目標ID
   * @returns 一致する目標、またはnull
   */
  async findOwned(userId: string, id: string) {
    const value = await this.prisma.goal.findFirst({
      where: { id, userId, archivedAt: null },
    });
    return value ? this.toDomain(value as unknown as StoredGoal) : null;
  }

  /**
   * ロードマップ項目が未選択または所有者の有効な項目か確認する。
   * @param userId ログイン中の利用者ID
   * @param roadmapItemId 選択されたロードマップ項目ID、またはnull
   * @returns 利用可能な場合はtrue
   */
  async roadmapItemIsOwned(userId: string, roadmapItemId: string | null) {
    if (roadmapItemId === null) return true;
    return Boolean(
      await this.prisma.roadmapItem.findFirst({
        where: { id: roadmapItemId, userId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * 評価期間が未選択または所有者の有効な期間か確認する。
   * @param userId ログイン中の利用者ID
   * @param evaluationPeriodId 選択された評価期間ID、またはnull
   * @returns 利用可能な場合はtrue
   */
  async evaluationPeriodIsOwned(
    userId: string,
    evaluationPeriodId: string | null,
  ) {
    if (evaluationPeriodId === null) return true;
    return Boolean(
      await this.prisma.evaluationPeriod.findFirst({
        where: { id: evaluationPeriodId, userId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * UUIDと所有者IDを付けて新しい目標を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する目標の入力値
   * @returns 登録した目標
   */
  async createOwned(userId: string, input: GoalInput) {
    const value = await this.prisma.goal.create({
      data: { ...input, id: randomUUID(), userId },
    });
    return this.toDomain(value as unknown as StoredGoal);
  }

  /**
   * 所有者の目標が存在する場合だけ入力内容を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する目標ID
   * @param input 更新後の入力値
   * @returns 更新した目標、またはnull
   */
  async updateOwned(userId: string, id: string, input: GoalInput) {
    if (!(await this.findOwned(userId, id))) return null;
    const value = await this.prisma.goal.update({
      where: { id },
      data: input,
    });
    return this.toDomain(value as unknown as StoredGoal);
  }

  /**
   * 所有者の目標へアーカイブ日時を設定して一覧から除外する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする目標ID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, id: string) {
    const result = await this.prisma.goal.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }

  /**
   * PrismaのDecimal値をAPIで扱いやすいnumberへ変換する。
   * @param stored MySQLから取得した目標
   * @returns ドメイン層で扱う目標
   */
  private toDomain(stored: StoredGoal): Goal {
    const { targetValue, currentValue, weight, ...rest } = stored;
    return {
      ...rest,
      targetValue: targetValue === null ? null : Number(targetValue),
      currentValue: currentValue === null ? null : Number(currentValue),
      weight: Number(weight),
    };
  }
}
