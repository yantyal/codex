import type { AuditLogger } from '../../domain/authorization/ownership.js';
import {
  RoadmapDependencyValidator,
  type RoadmapDependencyRepository,
} from '../../domain/roadmap/roadmap-dependency.js';

/** 所有者単位でロードマップの前提項目表示と更新を処理する。 */
export class RoadmapDependencyService {
  /**
   * 依存関係の保存先と監査記録先を受け取る。
   * @param repository 所有者条件付きで依存関係を保存するリポジトリ
   * @param audit 認可結果を保存する監査記録先
   */
  constructor(
    private readonly repository: RoadmapDependencyRepository,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 対象項目の所有者を確認して前提項目を返す。
   * @param userId ログイン中の利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @returns 成功時は前提項目、失敗時は利用者向けメッセージ
   */
  async find(userId: string, roadmapItemId: string) {
    const item = await this.repository.findItemOwned(userId, roadmapItemId);
    await this.log(userId, roadmapItemId, 'read', Boolean(item));
    if (!item)
      return {
        ok: false as const,
        items: [],
        message: 'ロードマップ項目が見つかりません。',
      };
    return {
      ok: true as const,
      items: await this.repository.listPrerequisitesOwned(
        userId,
        roadmapItemId,
      ),
    };
  }

  /**
   * 所有者・同一目標・循環禁止を検証して前提項目を置き換える。
   * @param userId ログイン中の利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @param prerequisiteItemIds 新しく設定する前提項目ID
   * @returns 成功時は更新後の前提項目、失敗時は利用者向けメッセージ
   */
  async replace(
    userId: string,
    roadmapItemId: string,
    prerequisiteItemIds: string[],
  ) {
    const item = await this.repository.findItemOwned(userId, roadmapItemId);
    if (!item) {
      await this.log(userId, roadmapItemId, 'update', false);
      return {
        ok: false as const,
        message: 'ロードマップ項目が見つかりません。',
      };
    }

    const uniqueIds = [...new Set(prerequisiteItemIds)];
    const prerequisites = await this.repository.findItemsOwned(
      userId,
      uniqueIds,
    );
    if (prerequisites.length !== uniqueIds.length) {
      await this.log(userId, roadmapItemId, 'update', false);
      return {
        ok: false as const,
        message: '選択できる前提項目が見つかりません。',
      };
    }
    if (
      prerequisites.some(
        ({ careerGoalId }) => careerGoalId !== item.careerGoalId,
      )
    ) {
      await this.log(userId, roadmapItemId, 'update', false);
      return {
        ok: false as const,
        message: '同じキャリア目標の項目だけを前提に設定できます。',
      };
    }

    const validationMessage = RoadmapDependencyValidator.validate(
      roadmapItemId,
      uniqueIds,
      await this.repository.listEdgesOwned(userId, item.careerGoalId),
    );
    if (validationMessage) {
      await this.log(userId, roadmapItemId, 'update', false);
      return { ok: false as const, message: validationMessage };
    }

    const replaced = await this.repository.replaceOwned(
      userId,
      roadmapItemId,
      uniqueIds,
    );
    await this.log(userId, roadmapItemId, 'update', replaced);
    if (!replaced)
      return {
        ok: false as const,
        message: 'ロードマップ項目が見つかりません。',
      };
    return {
      ok: true as const,
      items: await this.repository.listPrerequisitesOwned(
        userId,
        roadmapItemId,
      ),
    };
  }

  /**
   * 参照・更新の許可結果をセキュリティ監査へ記録する。
   * @param userId 操作した利用者ID
   * @param resourceId 操作対象のロードマップ項目ID
   * @param action 操作の種類
   * @param allowed 操作を許可できたか
   * @returns 記録完了を表すPromise
   */
  private async log(
    userId: string,
    resourceId: string,
    action: 'read' | 'update',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'roadmap-dependency',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
