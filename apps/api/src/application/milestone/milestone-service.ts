import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type {
  MilestoneInput,
  MilestoneRepository,
} from '../../domain/milestone/milestone.js';

/** 所有者単位でマイルストーンのCRUDと入力検証を処理する。 */
export class MilestoneService {
  /**
   * マイルストーンの保存先と監査ログ記録先を受け取る。
   * @param repository 所有者条件付きでマイルストーンを保存するリポジトリ
   * @param audit 認可結果を保存する監査ログ記録先
   */
  constructor(
    private readonly repository: MilestoneRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 所有する目標のマイルストーン一覧を返す。
   * @param userId ログイン中の利用者ID
   * @param goalId 一覧を取得する目標ID
   * @returns 成功時は期限順の一覧、失敗時は利用者向けメッセージ
   */
  async list(userId: string, goalId: string) {
    if (!(await this.repository.goalCanUseMilestones(userId, goalId)))
      return { ok: false as const, message: this.goalNotFound };
    return {
      ok: true as const,
      items: await this.repository.listOwned(userId, goalId),
    };
  }

  /**
   * 所有者、目標、IDが一致するマイルストーンを返して監査する。
   * @param userId ログイン中の利用者ID
   * @param goalId マイルストーンが属する目標ID
   * @param id 取得するマイルストーンID
   * @returns 成功時はマイルストーン、失敗時は利用者向けメッセージ
   */
  async find(userId: string, goalId: string, id: string) {
    const value = await this.repository.findOwned(userId, goalId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: this.notFound };
  }

  /**
   * 入力と目標の所有権を検証してマイルストーンを登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録するマイルストーンの入力値
   * @returns 成功時は登録値、失敗時は利用者向けメッセージ
   */
  async create(userId: string, input: MilestoneInput) {
    const normalized = this.normalize(input);
    const message = await this.validate(userId, normalized);
    if (message) return { ok: false as const, message };
    return {
      ok: true as const,
      value: await this.repository.createOwned(userId, normalized),
    };
  }

  /**
   * 入力と所有権を検証して既存のマイルストーンを更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新するマイルストーンID
   * @param input 更新後の入力値
   * @returns 成功時は更新値、失敗時は利用者向けメッセージ
   */
  async update(userId: string, id: string, input: MilestoneInput) {
    const normalized = this.normalize(input);
    const message = await this.validate(userId, normalized);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, normalized);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: this.notFound };
  }

  /**
   * 所有するマイルストーンをアーカイブして結果を監査する。
   * @param userId ログイン中の利用者ID
   * @param goalId マイルストーンが属する目標ID
   * @param id アーカイブするマイルストーンID
   * @returns アーカイブできた場合はtrue
   */
  async archive(userId: string, goalId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, goalId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }

  /**
   * 完了以外の状態では完了日を未設定へそろえる。
   * @param input 正規化する入力値
   * @returns 状態に合う完了日を持つ入力値
   */
  private normalize(input: MilestoneInput): MilestoneInput {
    return {
      ...input,
      completedDate: input.status === 'completed' ? input.completedDate : null,
    };
  }

  /**
   * 入力値と親目標の利用可否を業務ルールに沿って検証する。
   * @param userId ログイン中の利用者ID
   * @param input 検証する入力値
   * @returns エラー時はメッセージ、問題がなければnull
   */
  private async validate(userId: string, input: MilestoneInput) {
    if (!input.goalId.trim()) return '対象の目標を選択してください。';
    if (!(await this.repository.goalCanUseMilestones(userId, input.goalId)))
      return this.goalNotFound;
    if (!input.name.trim() || input.name.length > 200)
      return 'マイルストーン名を1〜200文字で入力してください。';
    if (Number.isNaN(input.dueDate.getTime()))
      return '正しい期限を入力してください。';
    if (input.completionCondition.length > 2000)
      return '完了条件を2,000文字以内で入力してください。';
    if (!Number.isFinite(input.weight) || input.weight <= 0)
      return '重みは0より大きい数値で入力してください。';
    if (
      !['not_started', 'in_progress', 'completed', 'on_hold'].includes(
        input.status,
      )
    )
      return '正しいステータスを選択してください。';
    if (
      input.status === 'completed' &&
      (!input.completedDate || Number.isNaN(input.completedDate.getTime()))
    )
      return '完了したマイルストーンには完了日を入力してください。';
    return null;
  }

  /**
   * 認可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象のマイルストーンID
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
      resourceType: 'milestone',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }

  /** 所有するマイルストーン型目標が見つからない場合の共通メッセージを返す。 */
  private get goalNotFound() {
    return '選択できるマイルストーン型の目標が見つかりません。';
  }

  /** マイルストーンが見つからない場合の共通メッセージを返す。 */
  private get notFound() {
    return 'マイルストーンが見つかりません。';
  }
}
