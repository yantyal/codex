import { randomUUID } from 'node:crypto';
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapItemRepository,
} from '../../domain/roadmap/roadmap-item.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って所有者単位のロードマップ項目をMySQLへ保存する。 */
export class PrismaRoadmapItemRepository implements RoadmapItemRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 所有者の有効な項目を開始日、表示順、作成日時の順で返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する項目の配列
   */
  async listOwned(userId: string): Promise<RoadmapItem[]> {
    return this.prisma.roadmapItem.findMany({
      where: { userId, archivedAt: null },
      orderBy: [
        { plannedStartDate: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    }) as Promise<RoadmapItem[]>;
  }

  /**
   * 所有者、ID、有効状態が一致する項目を1件返す。
   * @param userId ログイン中の利用者ID
   * @param id 参照する項目ID
   * @returns 一致する項目、またはnull
   */
  async findOwned(userId: string, id: string): Promise<RoadmapItem | null> {
    return this.prisma.roadmapItem.findFirst({
      where: { id, userId, archivedAt: null },
    }) as Promise<RoadmapItem | null>;
  }

  /**
   * キャリア目標が所有者の有効なデータか確認する。
   * @param userId ログイン中の利用者ID
   * @param careerGoalId 選択されたキャリア目標ID
   * @returns 利用可能な場合はtrue
   */
  async careerGoalIsOwned(userId: string, careerGoalId: string) {
    return Boolean(
      await this.prisma.careerGoal.findFirst({
        where: { id: careerGoalId, userId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * 未選択または所有者の有効なスキルであれば利用可能と返す。
   * @param userId ログイン中の利用者ID
   * @param skillId 選択されたスキルID、未選択の場合はnull
   * @returns 利用可能な場合はtrue
   */
  async skillIsOwned(userId: string, skillId: string | null) {
    if (skillId === null) return true;
    return Boolean(
      await this.prisma.skill.findFirst({
        where: { id: skillId, userId, archivedAt: null },
        select: { id: true },
      }),
    );
  }

  /**
   * UUIDと所有者IDを付けて新しい項目を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する項目の入力値
   * @returns 登録した項目
   */
  async createOwned(userId: string, input: RoadmapItemInput) {
    return this.prisma.roadmapItem.create({
      data: { ...input, id: randomUUID(), userId },
    }) as Promise<RoadmapItem>;
  }

  /**
   * 所有者の項目が存在する場合だけ入力内容を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する項目ID
   * @param input 更新後の入力値
   * @returns 更新した項目、またはnull
   */
  async updateOwned(userId: string, id: string, input: RoadmapItemInput) {
    if (!(await this.findOwned(userId, id))) return null;
    return this.prisma.roadmapItem.update({
      where: { id },
      data: input,
    }) as Promise<RoadmapItem>;
  }

  /**
   * 所有者の項目へアーカイブ日時を設定して一覧から除外する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする項目ID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, id: string) {
    const result = await this.prisma.roadmapItem.updateMany({
      where: { id, userId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return result.count === 1;
  }
}
