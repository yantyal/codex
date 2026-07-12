import type {
  AuditLogger,
  OwnedResource,
  OwnedResourceRepository,
} from '../../domain/authorization/ownership.js';

export type OwnershipResult<T> =
  { ok: true; value: T } | { ok: false; status: 404; message: string };

/** 所有者条件付きの取得・更新・削除と監査記録を共通化する。 */
export class OwnedResourceService<T extends OwnedResource, U> {
  /**
   * 所有者認可サービスを作成する。
   * @param resourceType 監査ログへ記録するリソース種別を指定する。
   * @param repository 所有者条件付きリポジトリを指定する。
   * @param auditLogger 認可結果の保存先を指定する。
   * @returns OwnedResourceServiceのインスタンスを返す。
   * @remarks 所有者が違う場合も対象なしと同じ応答にする。
   */
  constructor(
    private readonly resourceType: string,
    private readonly repository: OwnedResourceRepository<T, U>,
    private readonly auditLogger: AuditLogger,
  ) {}

  /** 認証済み利用者が所有するリソースだけを取得する。 */
  async find(userId: string, resourceId: string): Promise<OwnershipResult<T>> {
    const value = await this.repository.findOwnedById(userId, resourceId);
    await this.audit(userId, resourceId, 'read', Boolean(value));
    return value ? { ok: true, value } : this.notFound();
  }

  /** 認証済み利用者が所有するリソースだけを更新する。 */
  async update(
    userId: string,
    resourceId: string,
    input: U,
  ): Promise<OwnershipResult<T>> {
    const value = await this.repository.updateOwned(userId, resourceId, input);
    await this.audit(userId, resourceId, 'update', Boolean(value));
    return value ? { ok: true, value } : this.notFound();
  }

  /** 認証済み利用者が所有するリソースだけを削除する。 */
  async delete(
    userId: string,
    resourceId: string,
  ): Promise<OwnershipResult<null>> {
    const deleted = await this.repository.deleteOwned(userId, resourceId);
    await this.audit(userId, resourceId, 'delete', deleted);
    return deleted ? { ok: true, value: null } : this.notFound();
  }

  /** 認可結果を共通形式で監査ログへ保存する。 */
  private async audit(
    userId: string,
    resourceId: string,
    action: 'read' | 'update' | 'delete',
    allowed: boolean,
  ): Promise<void> {
    await this.auditLogger.write({
      actorUserId: userId,
      action,
      resourceType: this.resourceType,
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }

  /** 対象の存在や所有者を明かさない共通エラーを作成する。 */
  private notFound(): OwnershipResult<never> {
    return {
      ok: false,
      status: 404,
      message: '対象のデータが見つかりません。',
    };
  }
}
