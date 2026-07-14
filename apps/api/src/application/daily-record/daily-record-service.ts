import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type {
  DailyRecordInput,
  DailyRecordRepository,
} from '../../domain/daily-record/daily-record.js';

/** 所有者単位で日次実績のCRUDと業務入力を検証する。 */
export class DailyRecordService {
  /**
   * 日次実績の保存先と監査ログ記録先を受け取る。
   * @param repository 所有者条件付きで日次実績を保存するリポジトリ
   * @param audit 認可結果を保存する監査ログ記録先
   */
  constructor(
    private readonly repository: DailyRecordRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 所有者の有効な日次実績を新しい順で返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する日次実績の配列
   */
  async list(userId: string) {
    return this.repository.listOwned(userId);
  }

  /**
   * 所有者とIDが一致する日次実績を返して認可結果を監査する。
   * @param userId ログイン中の利用者ID
   * @param id 取得する日次実績ID
   * @returns 成功時は日次実績、失敗時は利用者向けメッセージ
   */
  async find(userId: string, id: string) {
    const value = await this.repository.findOwned(userId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: this.notFound };
  }

  /**
   * 入力と関連データの所有権を検証して日次実績を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する日次実績
   * @returns 成功時は登録値、失敗時は利用者向けメッセージ
   */
  async create(userId: string, input: DailyRecordInput) {
    const message = await this.validate(userId, input);
    if (message) return { ok: false as const, message };
    return {
      ok: true as const,
      value: await this.repository.createOwned(userId, input),
    };
  }

  /**
   * 入力と所有権を検証して既存の日次実績を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新する日次実績ID
   * @param input 更新後の入力値
   * @returns 成功時は更新値、失敗時は利用者向けメッセージ
   */
  async update(userId: string, id: string, input: DailyRecordInput) {
    const message = await this.validate(userId, input);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, input);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: this.notFound };
  }

  /**
   * 所有者の日次実績をアーカイブして認可結果を監査する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブする日次実績ID
   * @returns アーカイブできた場合はtrue
   */
  async archive(userId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }

  /**
   * 日次実績と関連データを業務ルールに沿って検証する。
   * @param userId ログイン中の利用者ID
   * @param input 検証する日次実績
   * @returns エラー時はメッセージ、問題がなければnull
   */
  private async validate(userId: string, input: DailyRecordInput) {
    if (!(await this.repository.goalIsOwned(userId, input.goalId)))
      return '選択できる目標が見つかりません。';
    if (
      !(await this.repository.milestoneBelongsToGoal(
        input.goalId,
        input.milestoneId,
      ))
    )
      return '選択したマイルストーンは対象目標に属していません。';
    if (Number.isNaN(input.activityDate.getTime()))
      return '正しい実施日を入力してください。';
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (input.activityDate > today) return '未来日は実施日に指定できません。';
    if (!input.description.trim() || input.description.length > 4000)
      return '実施内容を1〜4,000文字で入力してください。';
    if (
      !Number.isInteger(input.workMinutes) ||
      input.workMinutes < 0 ||
      input.workMinutes > 1440
    )
      return '作業時間を0〜1,440分で入力してください。';
    if (
      input.progressAmount !== null &&
      (!Number.isFinite(input.progressAmount) || input.progressAmount < 0)
    )
      return '進捗量は0以上の数値で入力してください。';
    if (
      input.learned.length > 2000 ||
      input.issue.length > 2000 ||
      input.nextAction.length > 2000
    )
      return '学び、困りごと、次の行動は各2,000文字以内で入力してください。';
    return null;
  }

  /**
   * 認可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象の日次実績ID
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
      resourceType: 'daily_record',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }

  /** 日次実績が見つからない場合の共通メッセージを返す。 */
  private get notFound() {
    return '日次実績が見つかりません。';
  }
}
