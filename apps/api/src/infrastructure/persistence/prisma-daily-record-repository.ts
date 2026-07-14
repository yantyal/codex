import { randomUUID } from 'node:crypto';
import type {
  DailyRecord,
  DailyRecordInput,
  DailyRecordRepository,
} from '../../domain/daily-record/daily-record.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

type StoredDailyRecord = Omit<DailyRecord, 'progressAmount'> & {
  progressAmount: unknown;
};

/** Prismaを使って所有者の日次実績をMySQLへ保存する。 */
export class PrismaDailyRecordRepository implements DailyRecordRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 目標が所有者の有効な目標か確認する。
   * @param userId 目標を所有する利用者ID
   * @param goalId 確認する目標ID
   * @returns 利用できる目標の場合はtrue
   */
  async goalIsOwned(userId: string, goalId: string) {
    return Boolean(
      await this.prisma.goal.findFirst({
        where: { id: goalId, userId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * マイルストーンが未選択または対象目標の有効な項目か確認する。
   * @param goalId 対象目標ID
   * @param milestoneId 確認するマイルストーンID、またはnull
   * @returns 利用可能な場合はtrue
   */
  async milestoneBelongsToGoal(goalId: string, milestoneId: string | null) {
    if (milestoneId === null) return true;
    return Boolean(
      await this.prisma.milestone.findFirst({
        where: { id: milestoneId, goalId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * 所有者の有効な日次実績を実施日の新しい順で返す。
   * @param userId 一覧を取得する利用者ID
   * @returns 所有者に一致する日次実績の配列
   */
  async listOwned(userId: string) {
    const values = await this.prisma.dailyRecord.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ activityDate: 'desc' }, { createdAt: 'desc' }],
    });
    return values.map((value) =>
      this.toDomain(value as unknown as StoredDailyRecord),
    );
  }

  /**
   * 所有者とIDが一致する有効な日次実績を返す。
   * @param userId 日次実績を所有する利用者ID
   * @param id 取得する日次実績ID
   * @returns 一致する日次実績、またはnull
   */
  async findOwned(userId: string, id: string) {
    const value = await this.prisma.dailyRecord.findFirst({
      where: { id, userId, archivedAt: null },
    });
    return value ? this.toDomain(value as unknown as StoredDailyRecord) : null;
  }

  /**
   * UUIDと所有者IDを付けて日次実績を登録する。
   * @param userId 日次実績を所有する利用者ID
   * @param input 登録する入力値
   * @returns 登録した日次実績
   */
  async createOwned(userId: string, input: DailyRecordInput) {
    const value = await this.prisma.dailyRecord.create({
      data: { ...input, id: randomUUID(), userId },
    });
    return this.toDomain(value as unknown as StoredDailyRecord);
  }

  /**
   * 所有者とIDが一致する場合だけ日次実績を更新する。
   * @param userId 日次実績を所有する利用者ID
   * @param id 更新する日次実績ID
   * @param input 更新後の入力値
   * @returns 更新した日次実績、またはnull
   */
  async updateOwned(userId: string, id: string, input: DailyRecordInput) {
    if (!(await this.findOwned(userId, id))) return null;
    const value = await this.prisma.dailyRecord.update({
      where: { id },
      data: input,
    });
    return this.toDomain(value as unknown as StoredDailyRecord);
  }

  /**
   * 所有者とIDが一致する場合だけアーカイブ日時を設定する。
   * @param userId 日次実績を所有する利用者ID
   * @param id アーカイブする日次実績ID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, id: string) {
    const result = await this.prisma.dailyRecord.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }

  /**
   * PrismaのDecimal型の進捗量をAPIで扱いやすいnumberへ変換する。
   * @param stored MySQLから取得した日次実績
   * @returns ドメイン層で扱う日次実績
   */
  private toDomain(stored: StoredDailyRecord): DailyRecord {
    const { progressAmount, ...rest } = stored;
    return {
      ...rest,
      progressAmount: progressAmount === null ? null : Number(progressAmount),
    };
  }
}
