import { randomUUID } from 'node:crypto';
import type {
  EvaluationPeriod,
  EvaluationPeriodInput,
  EvaluationPeriodRepository,
} from '../../domain/evaluation/evaluation-period.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って所有者単位の評価期間をMySQLへ保存する。 */
export class PrismaEvaluationPeriodRepository implements EvaluationPeriodRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 所有者の有効な評価期間を開始日の新しい順で返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する評価期間の配列
   */
  async listOwned(userId: string): Promise<EvaluationPeriod[]> {
    return this.prisma.evaluationPeriod.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    }) as Promise<EvaluationPeriod[]>;
  }

  /**
   * 所有者、ID、有効状態が一致する評価期間を返す。
   * @param userId ログイン中の利用者ID
   * @param id 参照する評価期間ID
   * @returns 一致する評価期間、またはnull
   */
  async findOwned(userId: string, id: string) {
    return this.prisma.evaluationPeriod.findFirst({
      where: { id, userId, archivedAt: null },
    }) as Promise<EvaluationPeriod | null>;
  }

  /**
   * UUIDと所有者IDを付けて新しい評価期間を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する評価期間の入力値
   * @returns 登録した評価期間
   */
  async createOwned(userId: string, input: EvaluationPeriodInput) {
    return this.prisma.evaluationPeriod.create({
      data: { ...input, id: randomUUID(), userId },
    }) as Promise<EvaluationPeriod>;
  }

  /**
   * 所有者の評価期間が存在する場合だけ入力内容を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する評価期間ID
   * @param input 更新後の入力値
   * @returns 更新した評価期間、またはnull
   */
  async updateOwned(userId: string, id: string, input: EvaluationPeriodInput) {
    if (!(await this.findOwned(userId, id))) return null;
    return this.prisma.evaluationPeriod.update({
      where: { id },
      data: input,
    }) as Promise<EvaluationPeriod>;
  }

  /**
   * 所有者の評価期間へアーカイブ日時を設定して一覧から除外する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする評価期間ID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, id: string) {
    const result = await this.prisma.evaluationPeriod.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }
}
