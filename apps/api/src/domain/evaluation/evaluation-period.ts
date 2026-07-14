/** 利用者が実績をまとめる開始日から終了日までの評価期間を表す。 */
export type EvaluationPeriod = {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  theme: string;
  archivedAt: Date | null;
};

/** 登録・更新時に利用者が入力する評価期間を表す。 */
export type EvaluationPeriodInput = Omit<
  EvaluationPeriod,
  'id' | 'userId' | 'archivedAt'
>;

/** 評価期間を必ず所有者条件付きで保存する境界を表す。 */
export interface EvaluationPeriodRepository {
  listOwned(userId: string): Promise<EvaluationPeriod[]>;
  findOwned(userId: string, id: string): Promise<EvaluationPeriod | null>;
  createOwned(
    userId: string,
    input: EvaluationPeriodInput,
  ): Promise<EvaluationPeriod>;
  updateOwned(
    userId: string,
    id: string,
    input: EvaluationPeriodInput,
  ): Promise<EvaluationPeriod | null>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
}
