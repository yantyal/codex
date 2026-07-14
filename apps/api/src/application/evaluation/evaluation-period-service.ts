import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type {
  EvaluationPeriodInput,
  EvaluationPeriodRepository,
} from '../../domain/evaluation/evaluation-period.js';

/** 所有者単位で評価期間の登録・一覧・詳細・更新・アーカイブを処理する。 */
export class EvaluationPeriodService {
  /**
   * 評価期間の保存先と監査記録先を受け取る。
   * @param repository 所有者条件付きで評価期間を保存するリポジトリ
   * @param audit 認可結果を保存する監査記録先
   */
  constructor(
    private readonly repository: EvaluationPeriodRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 所有者の有効な評価期間を返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する評価期間の配列
   */
  async list(userId: string) {
    return this.repository.listOwned(userId);
  }

  /**
   * 所有者とIDが一致する評価期間を返し、参照結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id 参照する評価期間ID
   * @returns 評価期間、または参照できない場合はnull
   */
  async find(userId: string, id: string) {
    const value = await this.repository.findOwned(userId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value;
  }

  /**
   * 入力値を検証して評価期間を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する評価期間の入力値
   * @returns 成功時は登録値、失敗時は利用者向けメッセージ
   */
  async create(userId: string, input: EvaluationPeriodInput) {
    const message = this.validate(input);
    if (message) return { ok: false as const, message };
    return {
      ok: true as const,
      value: await this.repository.createOwned(userId, input),
    };
  }

  /**
   * 入力値と所有者を検証して既存の評価期間を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する評価期間ID
   * @param input 更新後の入力値
   * @returns 成功時は更新値、失敗時は利用者向けメッセージ
   */
  async update(userId: string, id: string, input: EvaluationPeriodInput) {
    const message = this.validate(input);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, input);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: '評価期間が見つかりません。' };
  }

  /**
   * 所有者の評価期間だけをアーカイブし、結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする評価期間ID
   * @returns アーカイブできた場合はtrue
   */
  async archive(userId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }

  /**
   * 期間名と日付が業務ルールを満たすか確認する。
   * @param input 検証する評価期間の入力値
   * @returns エラーがあればメッセージ、問題がなければnull
   */
  private validate(input: EvaluationPeriodInput) {
    if (!input.name?.trim() || input.name.length > 200)
      return '期間名を1～200文字で入力してください。';
    if (
      !(input.startDate instanceof Date) ||
      Number.isNaN(input.startDate.getTime()) ||
      !(input.endDate instanceof Date) ||
      Number.isNaN(input.endDate.getTime())
    )
      return '正しい開始日と終了日を入力してください。';
    if (input.endDate < input.startDate)
      return '終了日は開始日以降にしてください。';
    return null;
  }

  /**
   * 参照・更新・削除の許可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象の評価期間ID
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
      resourceType: 'evaluation-period',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
