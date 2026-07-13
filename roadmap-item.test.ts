import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapItemRepository,
} from './apps/api/src/domain/roadmap/roadmap-item';
import { RoadmapItemService } from './apps/api/src/application/roadmap/roadmap-item-service';

/** テスト中だけロードマップ項目をメモリへ保存する。 */
class RoadmapItems implements RoadmapItemRepository {
  values: RoadmapItem[] = [];

  /**
   * 所有者の有効な項目を開始日と表示順で返す。
   * @param userId 一覧を取得する利用者ID
   * @returns 所有者に一致する項目の配列
   */
  async listOwned(userId: string): Promise<RoadmapItem[]> {
    return this.values
      .filter((item) => item.userId === userId && !item.archivedAt)
      .sort(
        (left, right) =>
          left.plannedStartDate.getTime() - right.plannedStartDate.getTime() ||
          left.sortOrder - right.sortOrder,
      );
  }

  /**
   * 所有者とIDが一致する有効な項目を返す。
   * @param userId 項目を所有する利用者ID
   * @param id 取得する項目ID
   * @returns 一致する項目、またはnull
   */
  async findOwned(userId: string, id: string): Promise<RoadmapItem | null> {
    return (
      this.values.find(
        (item) => item.id === id && item.userId === userId && !item.archivedAt,
      ) ?? null
    );
  }

  /**
   * 所有者のキャリア目標が存在するか返す。
   * @param userId 確認する利用者ID
   * @param careerGoalId 確認するキャリア目標ID
   * @returns テスト用の所有者とIDが一致する場合はtrue
   */
  async careerGoalIsOwned(userId: string, careerGoalId: string) {
    return userId === 'owner' && careerGoalId === 'goal-1';
  }

  /**
   * 未選択または所有者のスキルなら利用可能と返す。
   * @param userId 確認する利用者ID
   * @param skillId 確認するスキルID、またはnull
   * @returns 利用できる場合はtrue
   */
  async skillIsOwned(userId: string, skillId: string | null) {
    return skillId === null || (userId === 'owner' && skillId === 'skill-1');
  }

  /**
   * 新しい項目へテスト用IDを付けて保存する。
   * @param userId 項目を所有する利用者ID
   * @param input 登録する入力値
   * @returns 登録した項目
   */
  async createOwned(userId: string, input: RoadmapItemInput) {
    const value = {
      ...input,
      id: `${this.values.length + 1}`,
      userId,
      archivedAt: null,
    };
    this.values.push(value);
    return value;
  }

  /**
   * 所有者の項目だけを更新し、見つからない場合はnullを返す。
   * @param userId 項目を所有する利用者ID
   * @param id 更新する項目ID
   * @param input 更新後の入力値
   * @returns 更新した項目、またはnull
   */
  async updateOwned(userId: string, id: string, input: RoadmapItemInput) {
    const value = await this.findOwned(userId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }

  /**
   * 所有者の項目を物理削除せずアーカイブする。
   * @param userId 項目を所有する利用者ID
   * @param id アーカイブする項目ID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, id: string) {
    const value = await this.findOwned(userId, id);
    if (!value) return false;
    value.archivedAt = new Date();
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

const input: RoadmapItemInput = {
  careerGoalId: 'goal-1',
  skillId: 'skill-1',
  name: 'TypeScript設計を習得する',
  plannedStartDate: new Date('2026-08-01'),
  plannedEndDate: new Date('2026-09-30'),
  sortOrder: 1,
  priority: 'high',
  status: 'planned',
  progressRate: 0,
};

test('所有者はロードマップ項目を登録・一覧・更新・アーカイブできる', async () => {
  const repository = new RoadmapItems();
  const service = new RoadmapItemService(repository, new Logs());

  expect((await service.create('owner', input)).ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect(
    (
      await service.update('owner', '1', {
        ...input,
        status: 'in_progress',
        progressRate: 50,
      })
    ).ok,
  ).toBe(true);
  expect(await service.archive('owner', '1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});

test('開始日と表示順で時系列に並べる', async () => {
  const repository = new RoadmapItems();
  const service = new RoadmapItemService(repository, new Logs());

  await service.create('owner', { ...input, sortOrder: 2 });
  await service.create('owner', {
    ...input,
    name: '先に表示する項目',
    sortOrder: 1,
  });

  expect((await service.list('owner')).map(({ name }) => name)).toEqual([
    '先に表示する項目',
    'TypeScript設計を習得する',
  ]);
});

test('別ユーザーは所有者の項目や関連データを利用できない', async () => {
  const repository = new RoadmapItems();
  const logs = new Logs();
  const service = new RoadmapItemService(repository, logs);
  await service.create('owner', input);

  expect(await service.find('other', '1')).toBeNull();
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', '1')).toBe(false);
  expect((await service.create('other', input)).ok).toBe(false);
});

test('終了日が開始日より前の場合は分かりやすいエラーを返す', async () => {
  const service = new RoadmapItemService(new RoadmapItems(), new Logs());

  expect(
    await service.create('owner', {
      ...input,
      plannedEndDate: new Date('2026-07-31'),
    }),
  ).toEqual({
    ok: false,
    message: '終了日は開始日以降にしてください。',
  });
});
