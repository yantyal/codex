/** 所有者認可の対象となるリソースを表す。 */
export type OwnedResource = { id: string; userId: string };

/** 所有者条件を必須にしてリソースを操作する境界を表す。 */
export interface OwnedResourceRepository<T extends OwnedResource, U> {
  /** 所有者とIDが一致するリソースを取得する。 */
  findOwnedById(userId: string, resourceId: string): Promise<T | null>;
  /** 所有者とIDが一致するリソースだけを更新する。 */
  updateOwned(userId: string, resourceId: string, input: U): Promise<T | null>;
  /** 所有者とIDが一致するリソースだけを削除する。 */
  deleteOwned(userId: string, resourceId: string): Promise<boolean>;
}

/** 監査ログへ記録する認可結果を表す。 */
export type AuditEvent = {
  actorUserId: string;
  action: 'read' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  outcome: 'allowed' | 'denied';
};

/** 認可結果を監査ログへ保存する境界を表す。 */
export interface AuditLogger {
  /** 認可結果を機密情報を含めずに保存する。 */
  write(event: AuditEvent): Promise<void>;
}
