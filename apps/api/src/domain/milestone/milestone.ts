/** マイルストーンの進行状態を表す。 */
export type MilestoneStatus =
  'not_started' | 'in_progress' | 'completed' | 'on_hold';

/** 目標を達成するまでの中間地点を表す。 */
export type Milestone = {
  id: string;
  goalId: string;
  name: string;
  dueDate: Date;
  completionCondition: string;
  weight: number;
  status: MilestoneStatus;
  completedDate: Date | null;
  archivedAt: Date | null;
};

/** マイルストーンの登録・更新時に利用者が入力する値を表す。 */
export type MilestoneInput = Omit<Milestone, 'id' | 'archivedAt'>;

/** 所有する目標に属するマイルストーンだけを保存する境界を表す。 */
export interface MilestoneRepository {
  /** 所有者の目標がマイルストーン方式で利用可能か確認する。 */
  goalCanUseMilestones(userId: string, goalId: string): Promise<boolean>;
  /** 所有する目標の有効なマイルストーンを返す。 */
  listOwned(userId: string, goalId: string): Promise<Milestone[]>;
  /** 所有者、目標、IDが一致する有効なマイルストーンを返す。 */
  findOwned(
    userId: string,
    goalId: string,
    id: string,
  ): Promise<Milestone | null>;
  /** 所有する目標へ新しいマイルストーンを登録する。 */
  createOwned(userId: string, input: MilestoneInput): Promise<Milestone>;
  /** 所有者、目標、IDが一致するマイルストーンを更新する。 */
  updateOwned(
    userId: string,
    id: string,
    input: MilestoneInput,
  ): Promise<Milestone | null>;
  /** 所有者、目標、IDが一致するマイルストーンをアーカイブする。 */
  archiveOwned(userId: string, goalId: string, id: string): Promise<boolean>;
}
