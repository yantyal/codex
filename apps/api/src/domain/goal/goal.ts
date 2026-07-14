/** 目標の達成率を求める方法を表す。 */
export type GoalCalculationType = 'numeric' | 'milestone' | 'habit' | 'manual';

/** 利用者が日々の実績を紐付けて進捗を管理する実行目標を表す。 */
export type Goal = {
  id: string;
  userId: string;
  roadmapItemId: string | null;
  evaluationPeriodId: string | null;
  name: string;
  description: string;
  category: string;
  calculationType: GoalCalculationType;
  startDate: Date;
  dueDate: Date;
  completionCondition: string;
  measurementMethod: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  plannedDays: number | null;
  manualProgress: number | null;
  manualReason: string;
  priority: 'high' | 'medium' | 'low';
  weight: number;
  status: 'not_started' | 'in_progress' | 'achieved' | 'on_hold';
  archivedAt: Date | null;
};

/** 登録・更新時に利用者が入力する実行目標を表す。 */
export type GoalInput = Omit<Goal, 'id' | 'userId' | 'archivedAt'>;

/** SMARTの不足している観点と利用者向けの改善案を表す。 */
export type SmartWarning = {
  aspect: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'time_bound';
  label: string;
  message: string;
};

/** 目標を必ず所有者条件付きで保存する境界を表す。 */
export interface GoalRepository {
  listOwned(userId: string): Promise<Goal[]>;
  findOwned(userId: string, id: string): Promise<Goal | null>;
  roadmapItemIsOwned(
    userId: string,
    roadmapItemId: string | null,
  ): Promise<boolean>;
  evaluationPeriodIsOwned(
    userId: string,
    evaluationPeriodId: string | null,
  ): Promise<boolean>;
  createOwned(userId: string, input: GoalInput): Promise<Goal>;
  updateOwned(
    userId: string,
    id: string,
    input: GoalInput,
  ): Promise<Goal | null>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
}

/** 目標の入力内容から不足しているSMARTの5観点を判定する。 */
export class SmartGoalEvaluator {
  /**
   * SMARTの各観点を満たしていない場合に改善案を返す。
   * @param input 判定する目標の入力値
   * @returns 不足しているSMART観点の配列
   * @remarks 警告は保存を禁止するエラーではなく、目標を具体化するための案内とする。
   */
  static evaluate(input: GoalInput): SmartWarning[] {
    const warnings: SmartWarning[] = [];
    if (
      input.name.trim().length < 5 ||
      input.completionCondition.trim().length < 10
    )
      warnings.push({
        aspect: 'specific',
        label: 'Specific（具体的）',
        message:
          '目標名と達成条件を、誰が読んでも分かる具体的な内容にしてください。',
      });
    if (
      input.measurementMethod.trim().length < 10 ||
      !this.hasMeasurementSettings(input)
    )
      warnings.push({
        aspect: 'measurable',
        label: 'Measurable（測定可能）',
        message: '測定方法と計算方式に必要な値を具体的にしてください。',
      });
    if (input.description.trim().length < 30)
      warnings.push({
        aspect: 'achievable',
        label: 'Achievable（達成可能）',
        message:
          '説明へ、達成までの手順や実現可能と考える根拠を加えてください。',
      });
    if (!input.roadmapItemId && !input.evaluationPeriodId)
      warnings.push({
        aspect: 'relevant',
        label: 'Relevant（関連性）',
        message:
          'ロードマップ項目または評価期間と関連付けて目的を明確にしてください。',
      });
    if (
      Number.isNaN(input.startDate.getTime()) ||
      Number.isNaN(input.dueDate.getTime()) ||
      input.dueDate < input.startDate
    )
      warnings.push({
        aspect: 'time_bound',
        label: 'Time-bound（期限）',
        message: '開始日以降の明確な期限を設定してください。',
      });
    return warnings;
  }

  /**
   * 計算方式ごとの測定に必要な値がそろっているか確認する。
   * @param input 判定する目標の入力値
   * @returns 測定に必要な値がそろっている場合はtrue
   */
  private static hasMeasurementSettings(input: GoalInput): boolean {
    if (input.calculationType === 'numeric')
      return (
        input.targetValue !== null &&
        input.targetValue > 0 &&
        input.currentValue !== null &&
        input.currentValue >= 0 &&
        Boolean(input.unit.trim())
      );
    if (input.calculationType === 'habit')
      return input.plannedDays !== null && input.plannedDays >= 1;
    if (input.calculationType === 'manual')
      return (
        input.manualProgress !== null &&
        input.manualProgress >= 0 &&
        input.manualProgress <= 100 &&
        Boolean(input.manualReason.trim())
      );
    return input.calculationType === 'milestone';
  }
}
