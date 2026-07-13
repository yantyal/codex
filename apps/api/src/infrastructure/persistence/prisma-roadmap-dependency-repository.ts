import type {
  RoadmapDependencyEdge,
  RoadmapDependencyItem,
  RoadmapDependencyRepository,
} from '../../domain/roadmap/roadmap-dependency.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って所有者単位のロードマップ依存関係をMySQLへ保存する。 */
export class PrismaRoadmapDependencyRepository implements RoadmapDependencyRepository {
  /**
   * データベースへ接続済みのPrismaクライアントを受け取る。
   * @param prisma MySQLへアクセスするPrismaクライアント
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 所有者、ID、有効状態が一致する項目を返す。
   * @param userId ログイン中の利用者ID
   * @param id 取得するロードマップ項目ID
   * @returns 一致する項目、またはnull
   */
  async findItemOwned(userId: string, id: string) {
    return this.prisma.roadmapItem.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true, careerGoalId: true, name: true },
    }) as Promise<RoadmapDependencyItem | null>;
  }

  /**
   * 所有者とID一覧に一致する有効な項目を返す。
   * @param userId ログイン中の利用者ID
   * @param ids 取得するロードマップ項目ID
   * @returns 所有者に一致する項目の配列
   */
  async findItemsOwned(userId: string, ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.roadmapItem.findMany({
      where: { id: { in: ids }, userId, archivedAt: null },
      select: { id: true, careerGoalId: true, name: true },
    }) as Promise<RoadmapDependencyItem[]>;
  }

  /**
   * 所有者の同一キャリア目標内にある有効な依存関係を返す。
   * @param userId ログイン中の利用者ID
   * @param careerGoalId 対象のキャリア目標ID
   * @returns 循環検証に使用する依存関係の配列
   */
  async listEdgesOwned(userId: string, careerGoalId: string) {
    return this.prisma.roadmapDependency.findMany({
      where: {
        roadmapItem: { userId, careerGoalId, archivedAt: null },
        prerequisiteItem: { userId, careerGoalId, archivedAt: null },
      },
      select: { roadmapItemId: true, prerequisiteItemId: true },
    }) as Promise<RoadmapDependencyEdge[]>;
  }

  /**
   * 対象項目に設定された所有者の有効な前提項目を時系列順で返す。
   * @param userId ログイン中の利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @returns 前提項目の配列
   */
  async listPrerequisitesOwned(userId: string, roadmapItemId: string) {
    const dependencies = await this.prisma.roadmapDependency.findMany({
      where: {
        roadmapItemId,
        roadmapItem: { userId, archivedAt: null },
        prerequisiteItem: { userId, archivedAt: null },
      },
      select: {
        prerequisiteItem: {
          select: { id: true, careerGoalId: true, name: true },
        },
      },
      orderBy: [
        { prerequisiteItem: { plannedStartDate: 'asc' } },
        { prerequisiteItem: { sortOrder: 'asc' } },
      ],
    });
    return dependencies.map(
      ({ prerequisiteItem }) => prerequisiteItem,
    ) as RoadmapDependencyItem[];
  }

  /**
   * 所有者を再確認し、対象項目の前提項目をトランザクションで置き換える。
   * @param userId ログイン中の利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @param prerequisiteItemIds 新しく設定する前提項目ID
   * @returns 所有者の項目を更新できた場合はtrue
   */
  async replaceOwned(
    userId: string,
    roadmapItemId: string,
    prerequisiteItemIds: string[],
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const item = await transaction.roadmapItem.findFirst({
        where: { id: roadmapItemId, userId, archivedAt: null },
        select: { id: true },
      });
      if (!item) return false;
      await transaction.roadmapDependency.deleteMany({
        where: { roadmapItemId },
      });
      if (prerequisiteItemIds.length)
        await transaction.roadmapDependency.createMany({
          data: prerequisiteItemIds.map((prerequisiteItemId) => ({
            roadmapItemId,
            prerequisiteItemId,
          })),
        });
      return true;
    });
  }
}
