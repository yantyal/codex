/** 利用者が目標へ記録する1日分の活動実績を表す。 */
export type DailyRecord = {
  id: string;
  userId: string;
  goalId: string;
  milestoneId: string | null;
  activityDate: Date;
  description: string;
  workMinutes: number;
  progressAmount: number | null;
  learned: string;
  issue: string;
  nextAction: string;
  archivedAt: Date | null;
};

/** 日次実績の登録・更新時に利用者が入力する値を表す。 */
export type DailyRecordInput = Omit<
  DailyRecord,
  'id' | 'userId' | 'archivedAt'
>;

/** 所有者条件を必須にして日次実績を保存する境界を表す。 */
export interface DailyRecordRepository {
  /** 目標が所有者の有効な目標か確認する。 */
  goalIsOwned(userId: string, goalId: string): Promise<boolean>;
  /** マイルストーンが未選択または目標に属する有効な項目か確認する。 */
  milestoneBelongsToGoal(
    goalId: string,
    milestoneId: string | null,
  ): Promise<boolean>;
  /** 所有者の有効な日次実績を返す。 */
  listOwned(userId: string): Promise<DailyRecord[]>;
  /** 所有者とIDが一致する有効な日次実績を返す。 */
  findOwned(userId: string, id: string): Promise<DailyRecord | null>;
  /** 所有者IDを付けて日次実績を登録する。 */
  createOwned(userId: string, input: DailyRecordInput): Promise<DailyRecord>;
  /** 所有者とIDが一致する日次実績を更新する。 */
  updateOwned(
    userId: string,
    id: string,
    input: DailyRecordInput,
  ): Promise<DailyRecord | null>;
  /** 所有者とIDが一致する日次実績をアーカイブする。 */
  archiveOwned(userId: string, id: string): Promise<boolean>;
}
