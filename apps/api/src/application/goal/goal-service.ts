import type { AuditLogger } from '../../domain/authorization/ownership.js';
import {
  SmartGoalEvaluator,
  type Goal,
  type GoalInput,
  type GoalRepository,
} from '../../domain/goal/goal.js';

/** 所有者単位で実行目標のCRUD、関連データ検証、SMART判定を処理する。 */
export class GoalService {
  /**
   * 実行目標の保存先と監査記録先を受け取る。
   * @param repository 所有者条件付きで目標を保存するリポジトリ
   * @param audit 認可結果を保存する監査記録先
   */
  constructor(
    private readonly repository: GoalRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 所有者の有効な目標へSMART警告を付けて返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する目標の配列
   */
  async list(userId: string) {
    return (await this.repository.listOwned(userId)).map((goal) =>
      this.withWarnings(goal),
    );
  }

  /**
   * 所有者とIDが一致する目標を返し、参照結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id 参照する目標ID
   * @returns 成功時は目標とSMART警告、失敗時は利用者向けメッセージ
   */
  async find(userId: string, id: string) {
    const value = await this.repository.findOwned(userId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value
      ? { ok: true as const, value: this.withWarnings(value) }
      : { ok: false as const, message: '目標が見つかりません。' };
  }

  /**
   * 入力と関連データの所有者を検証して目標を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する目標の入力値
   * @returns 成功時は登録値とSMART警告、失敗時は利用者向けメッセージ
   */
  async create(userId: string, input: GoalInput) {
    const normalized = this.normalize(input);
    const message = await this.validate(userId, normalized);
    if (message) return { ok: false as const, message };
    const value = await this.repository.createOwned(userId, normalized);
    return {
      ok: true as const,
      value,
      warnings: SmartGoalEvaluator.evaluate(normalized),
    };
  }

  /**
   * 入力と所有者を検証して既存の目標を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する目標ID
   * @param input 更新後の入力値
   * @returns 成功時は更新値とSMART警告、失敗時は利用者向けメッセージ
   */
  async update(userId: string, id: string, input: GoalInput) {
    const normalized = this.normalize(input);
    const message = await this.validate(userId, normalized);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, normalized);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? {
          ok: true as const,
          value,
          warnings: SmartGoalEvaluator.evaluate(normalized),
        }
      : { ok: false as const, message: '目標が見つかりません。' };
  }

  /**
   * 所有者の目標だけをアーカイブし、結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする目標ID
   * @returns アーカイブできた場合はtrue
   */
  async archive(userId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }

  /**
   * DBへ保存せず現在の入力に対するSMART警告を返す。
   * @param input 判定する目標の入力値
   * @returns 不足しているSMART観点の配列
   */
  evaluateSmart(input: GoalInput) {
    return SmartGoalEvaluator.evaluate(this.normalize(input));
  }

  /**
   * 計算方式で使わない条件付き項目を初期値へ戻す。
   * @param input 正規化する目標の入力値
   * @returns 計算方式に必要な値だけを保持した入力値
   */
  private normalize(input: GoalInput): GoalInput {
    return {
      ...input,
      targetValue:
        input.calculationType === 'numeric' ? input.targetValue : null,
      currentValue:
        input.calculationType === 'numeric' ? input.currentValue : null,
      unit: input.calculationType === 'numeric' ? input.unit : '',
      plannedDays: input.calculationType === 'habit' ? input.plannedDays : null,
      manualProgress:
        input.calculationType === 'manual' ? input.manualProgress : null,
      manualReason:
        input.calculationType === 'manual' ? input.manualReason : '',
    };
  }

  /**
   * 入力値と関連データが業務ルールを満たすか確認する。
   * @param userId ログイン中の利用者ID
   * @param input 検証する目標の入力値
   * @returns エラーがあればメッセージ、問題がなければnull
   */
  private async validate(userId: string, input: GoalInput) {
    if (!input.name.trim() || input.name.length > 200)
      return '目標名を1～200文字で入力してください。';
    if (!input.description.trim() || input.description.length > 2000)
      return '説明を1～2,000文字で入力してください。';
    if (!input.category.trim() || input.category.length > 100)
      return '分類を1～100文字で入力してください。';
    if (
      !input.completionCondition.trim() ||
      input.completionCondition.length > 2000 ||
      !input.measurementMethod.trim() ||
      input.measurementMethod.length > 2000
    )
      return '達成条件と測定方法を1～2,000文字で入力してください。';
    if (
      Number.isNaN(input.startDate.getTime()) ||
      Number.isNaN(input.dueDate.getTime())
    )
      return '正しい開始日と期限を入力してください。';
    if (input.dueDate < input.startDate)
      return '期限は開始日以降にしてください。';
    if (
      !['numeric', 'milestone', 'habit', 'manual'].includes(
        input.calculationType,
      )
    )
      return '正しい計算方式を選択してください。';
    if (
      input.calculationType === 'numeric' &&
      (input.targetValue === null ||
        !Number.isFinite(input.targetValue) ||
        input.targetValue <= 0 ||
        input.currentValue === null ||
        !Number.isFinite(input.currentValue) ||
        input.currentValue < 0 ||
        !input.unit.trim())
    )
      return '数値型は0より大きい目標値、0以上の現在値、単位が必要です。';
    if (
      input.calculationType === 'habit' &&
      (input.plannedDays === null ||
        !Number.isInteger(input.plannedDays) ||
        input.plannedDays < 1)
    )
      return '習慣型は1日以上の計画日数が必要です。';
    if (
      input.calculationType === 'manual' &&
      (input.manualProgress === null ||
        !Number.isInteger(input.manualProgress) ||
        input.manualProgress < 0 ||
        input.manualProgress > 100 ||
        !input.manualReason.trim())
    )
      return '手動型は0～100の進捗率と判断理由が必要です。';
    if (!Number.isFinite(input.weight) || input.weight <= 0)
      return '評価上の重みは0より大きい数値で入力してください。';
    if (!['high', 'medium', 'low'].includes(input.priority))
      return '正しい優先度を選択してください。';
    if (
      !['not_started', 'in_progress', 'achieved', 'on_hold'].includes(
        input.status,
      )
    )
      return '正しいステータスを選択してください。';
    if (
      !(await this.repository.roadmapItemIsOwned(userId, input.roadmapItemId))
    )
      return '選択できるロードマップ項目が見つかりません。';
    if (
      !(await this.repository.evaluationPeriodIsOwned(
        userId,
        input.evaluationPeriodId,
      ))
    )
      return '選択できる評価期間が見つかりません。';
    return null;
  }

  /**
   * 目標へSMART警告を付けて画面表示用の値を作る。
   * @param goal SMART判定する保存済み目標
   * @returns SMART警告付きの目標
   */
  private withWarnings(goal: Goal) {
    return { ...goal, smartWarnings: SmartGoalEvaluator.evaluate(goal) };
  }

  /**
   * 参照・更新・削除の許可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象の目標ID
   * @param action 操作の種類
   * @param allowed 操作を許可できたか
   * @returns 記録完了を表すPromise
   */
  private async log(
    userId: string,
    resourceId: string,
    action: 'read' | 'update' | 'delete',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'goal',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
