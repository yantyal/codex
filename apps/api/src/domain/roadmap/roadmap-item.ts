/** 利用者がキャリア目標へ向けて進める時系列の計画項目を表す。 */
export type RoadmapItem = {
  id: string;
  userId: string;
  careerGoalId: string;
  skillId: string | null;
  name: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  sortOrder: number;
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  progressRate: number;
  archivedAt: Date | null;
};

/** 登録・更新時に利用者が入力するロードマップ項目を表す。 */
export type RoadmapItemInput = Omit<
  RoadmapItem,
  'id' | 'userId' | 'archivedAt'
>;

/** ロードマップ項目を必ず所有者条件付きで保存する境界を表す。 */
export interface RoadmapItemRepository {
  listOwned(userId: string): Promise<RoadmapItem[]>;
  findOwned(userId: string, id: string): Promise<RoadmapItem | null>;
  careerGoalIsOwned(userId: string, careerGoalId: string): Promise<boolean>;
  skillIsOwned(userId: string, skillId: string | null): Promise<boolean>;
  createOwned(userId: string, input: RoadmapItemInput): Promise<RoadmapItem>;
  updateOwned(
    userId: string,
    id: string,
    input: RoadmapItemInput,
  ): Promise<RoadmapItem | null>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
}
