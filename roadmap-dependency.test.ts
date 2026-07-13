import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import { RoadmapDependencyService } from './apps/api/src/application/roadmap/roadmap-dependency-service';
import {
  RoadmapDependencyValidator,
  type RoadmapDependencyEdge,
  type RoadmapDependencyItem,
  type RoadmapDependencyRepository,
} from './apps/api/src/domain/roadmap/roadmap-dependency';

/** テスト中だけロードマップ項目と依存関係をメモリへ保存する。 */
class Dependencies implements RoadmapDependencyRepository {
  items: RoadmapDependencyItem[] = [
    { id: 'a', careerGoalId: 'goal-1', name: '設計を学ぶ' },
    { id: 'b', careerGoalId: 'goal-1', name: '設計を実践する' },
    { id: 'c', careerGoalId: 'goal-1', name: '設計を共有する' },
    { id: 'other-goal', careerGoalId: 'goal-2', name: '別目標の項目' },
  ];
  edges: RoadmapDependencyEdge[] = [];

  /**
   * 所有者とIDが一致する項目を返す。
   * @param userId 項目を所有する利用者ID
   * @param id 取得する項目ID
   * @returns 所有者の項目、またはnull
   */
  async findItemOwned(userId: string, id: string) {
    if (userId !== 'owner') return null;
    return this.items.find((item) => item.id === id) ?? null;
  }

  /**
   * 所有者とID一覧が一致する項目を返す。
   * @param userId 項目を所有する利用者ID
   * @param ids 取得する項目IDの配列
   * @returns 所有者に一致する項目の配列
   */
  async findItemsOwned(userId: string, ids: string[]) {
    if (userId !== 'owner') return [];
    return this.items.filter((item) => ids.includes(item.id));
  }

  /**
   * キャリア目標内にある依存関係を返す。
   * @param userId 項目を所有する利用者ID
   * @param careerGoalId 対象のキャリア目標ID
   * @returns 同じ目標に属する依存関係の配列
   */
  async listEdgesOwned(userId: string, careerGoalId: string) {
    if (userId !== 'owner') return [];
    const itemIds = this.items
      .filter((item) => item.careerGoalId === careerGoalId)
      .map(({ id }) => id);
    return this.edges.filter(
      (edge) =>
        itemIds.includes(edge.roadmapItemId) &&
        itemIds.includes(edge.prerequisiteItemId),
    );
  }

  /**
   * 対象項目に設定された前提項目を返す。
   * @param userId 項目を所有する利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @returns 前提項目の配列
   */
  async listPrerequisitesOwned(userId: string, roadmapItemId: string) {
    if (userId !== 'owner') return [];
    const ids = this.edges
      .filter((edge) => edge.roadmapItemId === roadmapItemId)
      .map((edge) => edge.prerequisiteItemId);
    return this.items.filter((item) => ids.includes(item.id));
  }

  /**
   * 対象項目の前提項目を新しいID一覧で置き換える。
   * @param userId 項目を所有する利用者ID
   * @param roadmapItemId 対象のロードマップ項目ID
   * @param prerequisiteItemIds 新しく設定する前提項目ID
   * @returns 所有者の項目を更新できた場合はtrue
   */
  async replaceOwned(
    userId: string,
    roadmapItemId: string,
    prerequisiteItemIds: string[],
  ) {
    if (!(await this.findItemOwned(userId, roadmapItemId))) return false;
    this.edges = this.edges
      .filter((edge) => edge.roadmapItemId !== roadmapItemId)
      .concat(
        prerequisiteItemIds.map((prerequisiteItemId) => ({
          roadmapItemId,
          prerequisiteItemId,
        })),
      );
    return true;
  }
}

/** テストで監査イベントを確認できるようにメモリへ記録する。 */
class Logs implements AuditLogger {
  events: AuditEvent[] = [];

  /**
   * 受け取った監査イベントを配列へ追加する。
   * @param event 記録する監査イベント
   * @returns 記録完了を表すPromise
   */
  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

test('自己参照を拒否する', () => {
  expect(RoadmapDependencyValidator.validate('a', ['a'], [])).toBe(
    '自分自身を前提項目にはできません。',
  );
});

test('複数項目を経由する循環参照を拒否する', () => {
  const edges = [
    { roadmapItemId: 'a', prerequisiteItemId: 'b' },
    { roadmapItemId: 'b', prerequisiteItemId: 'c' },
  ];

  expect(RoadmapDependencyValidator.validate('c', ['a'], edges)).toBe(
    '循環参照になるため前提項目を設定できません。',
  );
});

test('同じキャリア目標の前提項目を登録して表示できる', async () => {
  const repository = new Dependencies();
  const service = new RoadmapDependencyService(repository, new Logs());

  expect((await service.replace('owner', 'b', ['a'])).ok).toBe(true);
  const result = await service.find('owner', 'b');
  expect(result.ok && result.items.map(({ id }) => id)).toEqual(['a']);
});

test('別キャリア目標や別ユーザーの項目は前提にできない', async () => {
  const repository = new Dependencies();
  const service = new RoadmapDependencyService(repository, new Logs());

  expect(await service.replace('owner', 'a', ['other-goal'])).toEqual({
    ok: false,
    message: '同じキャリア目標の項目だけを前提に設定できます。',
  });
  expect((await service.replace('other', 'a', ['b'])).ok).toBe(false);
});

test('空の配列で前提項目をすべて解除できる', async () => {
  const repository = new Dependencies();
  repository.edges = [{ roadmapItemId: 'b', prerequisiteItemId: 'a' }];
  const service = new RoadmapDependencyService(repository, new Logs());

  expect((await service.replace('owner', 'b', [])).ok).toBe(true);
  expect((await service.find('owner', 'b')).items).toEqual([]);
});
