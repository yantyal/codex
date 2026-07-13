/** 依存関係の検証に必要なロードマップ項目の最小情報を表す。 */
export type RoadmapDependencyItem = {
  id: string;
  careerGoalId: string;
  name: string;
};

/** 対象項目から前提項目へ向かう依存関係を表す。 */
export type RoadmapDependencyEdge = {
  roadmapItemId: string;
  prerequisiteItemId: string;
};

/** ロードマップ依存関係を必ず所有者条件付きで保存する境界を表す。 */
export interface RoadmapDependencyRepository {
  findItemOwned(
    userId: string,
    id: string,
  ): Promise<RoadmapDependencyItem | null>;
  findItemsOwned(
    userId: string,
    ids: string[],
  ): Promise<RoadmapDependencyItem[]>;
  listEdgesOwned(
    userId: string,
    careerGoalId: string,
  ): Promise<RoadmapDependencyEdge[]>;
  listPrerequisitesOwned(
    userId: string,
    roadmapItemId: string,
  ): Promise<RoadmapDependencyItem[]>;
  replaceOwned(
    userId: string,
    roadmapItemId: string,
    prerequisiteItemIds: string[],
  ): Promise<boolean>;
}

/** ロードマップ依存関係の自己参照と循環参照を検証する。 */
export class RoadmapDependencyValidator {
  /**
   * 対象項目の前提を置き換えたグラフが循環しないか検証する。
   * @param roadmapItemId 前提項目を設定する対象ID
   * @param prerequisiteItemIds 新しく設定する前提項目ID
   * @param existingEdges 同じキャリア目標にある現在の依存関係
   * @returns エラーがあればメッセージ、問題がなければnull
   */
  static validate(
    roadmapItemId: string,
    prerequisiteItemIds: string[],
    existingEdges: RoadmapDependencyEdge[],
  ): string | null {
    if (prerequisiteItemIds.includes(roadmapItemId))
      return '自分自身を前提項目にはできません。';

    const edges = existingEdges
      .filter((edge) => edge.roadmapItemId !== roadmapItemId)
      .concat(
        prerequisiteItemIds.map((prerequisiteItemId) => ({
          roadmapItemId,
          prerequisiteItemId,
        })),
      );
    const graph = new Map<string, string[]>();
    for (const edge of edges) {
      const next = graph.get(edge.roadmapItemId) ?? [];
      next.push(edge.prerequisiteItemId);
      graph.set(edge.roadmapItemId, next);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    /**
     * 深さ優先で経路をたどり、同じ経路上の項目へ戻るか確認する。
     * @param id 現在確認しているロードマップ項目ID
     * @returns 循環が見つかった場合はtrue
     */
    const hasCycle = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const next of graph.get(id) ?? []) {
        if (hasCycle(next)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    const nodes = new Set(
      edges.flatMap((edge) => [edge.roadmapItemId, edge.prerequisiteItemId]),
    );
    for (const node of nodes) {
      if (hasCycle(node)) return '循環参照になるため前提項目を設定できません。';
    }
    return null;
  }
}
