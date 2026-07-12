import type {
  AuditEvent,
  AuditLogger,
  OwnedResourceRepository,
} from './apps/api/src/domain/authorization/ownership';
import { OwnedResourceService } from './apps/api/src/application/authorization/owned-resource-service';

type TestResource = { id: string; userId: string; name: string };

/** 所有者条件を検証するためのメモリリポジトリを表す。 */
class TestRepository implements OwnedResourceRepository<
  TestResource,
  { name: string }
> {
  readonly resource: TestResource = {
    id: 'resource-1',
    userId: 'owner-1',
    name: '変更前',
  };
  async findOwnedById(userId: string, resourceId: string) {
    return userId === this.resource.userId && resourceId === this.resource.id
      ? this.resource
      : null;
  }
  async updateOwned(
    userId: string,
    resourceId: string,
    input: { name: string },
  ) {
    const found = await this.findOwnedById(userId, resourceId);
    if (!found) return null;
    found.name = input.name;
    return found;
  }
  async deleteOwned(userId: string, resourceId: string) {
    return Boolean(await this.findOwnedById(userId, resourceId));
  }
}

/** テスト中の監査イベントをメモリへ保存する。 */
class TestAuditLogger implements AuditLogger {
  readonly events: AuditEvent[] = [];
  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('OwnedResourceService', () => {
  test.each(['find', 'update', 'delete'] as const)(
    '別ユーザーによる%sを拒否して監査ログへ記録する',
    async (operation) => {
      const repository = new TestRepository();
      const logger = new TestAuditLogger();
      const service = new OwnedResourceService(
        'skill-category',
        repository,
        logger,
      );

      const result =
        operation === 'find'
          ? await service.find('other-user', 'resource-1')
          : operation === 'update'
            ? await service.update('other-user', 'resource-1', {
                name: '不正変更',
              })
            : await service.delete('other-user', 'resource-1');

      expect(result).toEqual({
        ok: false,
        status: 404,
        message: '対象のデータが見つかりません。',
      });
      expect(repository.resource.name).toBe('変更前');
      expect(logger.events).toEqual([
        expect.objectContaining({
          actorUserId: 'other-user',
          action: operation === 'find' ? 'read' : operation,
          outcome: 'denied',
        }),
      ]);
    },
  );
});
