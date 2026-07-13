import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type {
  RoadmapItemInput,
  RoadmapItemRepository,
} from '../../domain/roadmap/roadmap-item.js';

/** 所有者単位でロードマップ項目のCRUDと入力検証を行う。 */
export class RoadmapItemService {
  /**
   * リポジトリと監査記録先を受け取ってサービスを作成する。
   * @param repository 所有者条件付きで項目を保存するリポジトリ
   * @param audit 認可結果を保存する監査記録先
   */
  constructor(
    private readonly repository: RoadmapItemRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 所有者の有効な項目を時系列順で返す。
   * @param userId ログイン中の利用者ID
   * @returns 所有者に一致する項目の配列
   */
  async list(userId: string) {
    return this.repository.listOwned(userId);
  }

  /**
   * 所有者とIDが一致する項目を返し、参照結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id 参照するロードマップ項目ID
   * @returns 項目、または参照できない場合はnull
   */
  async find(userId: string, id: string) {
    const value = await this.repository.findOwned(userId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value;
  }

  /**
   * 入力と関連データの所有者を検証して項目を登録する。
   * @param userId ログイン中の利用者ID
   * @param input 登録する項目の入力値
   * @returns 成功時は登録値、失敗時は利用者向けメッセージ
   */
  async create(userId: string, input: RoadmapItemInput) {
    const message = await this.validate(userId, input);
    if (message) return { ok: false as const, message };
    return {
      ok: true as const,
      value: await this.repository.createOwned(userId, input),
    };
  }

  /**
   * 入力と所有者を検証して既存項目を更新する。
   * @param userId ログイン中の利用者ID
   * @param id 更新するロードマップ項目ID
   * @param input 更新後の入力値
   * @returns 成功時は更新値、失敗時は利用者向けメッセージ
   */
  async update(userId: string, id: string, input: RoadmapItemInput) {
    const message = await this.validate(userId, input);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, input);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: 'ロードマップ項目が見つかりません。' };
  }

  /**
   * 所有者の項目だけをアーカイブし、結果を監査記録する。
   * @param userId ログイン中の利用者ID
   * @param id アーカイブするロードマップ項目ID
   * @returns アーカイブできた場合はtrue
   */
  async archive(userId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }

  /**
   * 入力値と関連データが業務ルールを満たすか確認する。
   * @param userId ログイン中の利用者ID
   * @param input 検証する項目の入力値
   * @returns エラーがあればメッセージ、問題がなければnull
   */
  private async validate(userId: string, input: RoadmapItemInput) {
    if (!input.name?.trim() || input.name.length > 200)
      return '項目名を1～200文字で入力してください。';
    if (
      !(input.plannedStartDate instanceof Date) ||
      Number.isNaN(input.plannedStartDate.getTime()) ||
      !(input.plannedEndDate instanceof Date) ||
      Number.isNaN(input.plannedEndDate.getTime())
    )
      return '正しい開始日と終了日を入力してください。';
    if (input.plannedEndDate < input.plannedStartDate)
      return '終了日は開始日以降にしてください。';
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
      return '表示順は0以上の整数で入力してください。';
    if (!['high', 'medium', 'low'].includes(input.priority))
      return '正しい優先度を選択してください。';
    if (
      !['planned', 'in_progress', 'completed', 'on_hold'].includes(input.status)
    )
      return '正しいステータスを選択してください。';
    if (
      !Number.isInteger(input.progressRate) ||
      input.progressRate < 0 ||
      input.progressRate > 100
    )
      return '進捗率は0～100の整数で入力してください。';
    if (!(await this.repository.careerGoalIsOwned(userId, input.careerGoalId)))
      return '選択できるキャリア目標が見つかりません。';
    if (!(await this.repository.skillIsOwned(userId, input.skillId)))
      return '選択できるスキルが見つかりません。';
    return null;
  }

  /**
   * 参照・更新・削除の許可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象の項目ID
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
      resourceType: 'roadmap-item',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
