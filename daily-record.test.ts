import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import { DailyRecordService } from './apps/api/src/application/daily-record/daily-record-service';
import type {
  DailyRecord,
  DailyRecordInput,
  DailyRecordRepository,
} from './apps/api/src/domain/daily-record/daily-record';

/** テスト中だけ日次実績と関連データをメモリへ保存する。 */
class DailyRecords implements DailyRecordRepository {
  values: DailyRecord[] = [];

  /** 所有者の目標か確認する。 */
  async goalIsOwned(userId: string, goalId: string) {
    return userId === 'owner' && goalId === 'goal-1';
  }
  /** マイルストーンが未選択または対象目標に属するか確認する。 */
  async milestoneBelongsToGoal(goalId: string, milestoneId: string | null) {
    return (
      milestoneId === null ||
      (goalId === 'goal-1' && milestoneId === 'milestone-1')
    );
  }
  /** 所有者の有効な日次実績を返す。 */
  async listOwned(userId: string) {
    return this.values.filter(
      (value) => value.userId === userId && !value.archivedAt,
    );
  }
  /** 所有者とIDが一致する日次実績を返す。 */
  async findOwned(userId: string, id: string) {
    return (
      this.values.find(
        (value) =>
          value.userId === userId && value.id === id && !value.archivedAt,
      ) ?? null
    );
  }
  /** テスト用IDと所有者IDを付けて日次実績を登録する。 */
  async createOwned(userId: string, input: DailyRecordInput) {
    const value = {
      ...input,
      id: `${this.values.length + 1}`,
      userId,
      archivedAt: null,
    };
    this.values.push(value);
    return value;
  }
  /** 所有者の日次実績だけを更新する。 */
  async updateOwned(userId: string, id: string, input: DailyRecordInput) {
    const value = await this.findOwned(userId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }
  /** 所有者の日次実績を物理削除せずアーカイブする。 */
  async archiveOwned(userId: string, id: string) {
    const value = await this.findOwned(userId, id);
    if (!value) return false;
    value.archivedAt = new Date();
    return true;
  }
}

/** テストで監査イベントを確認できるようにメモリへ保存する。 */
class Logs implements AuditLogger {
  events: AuditEvent[] = [];
  /** 受け取った監査イベントを配列へ追加する。 */
  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

const input: DailyRecordInput = {
  goalId: 'goal-1',
  milestoneId: 'milestone-1',
  activityDate: new Date('2026-07-01'),
  description: '設計レビューを実施した。',
  workMinutes: 90,
  progressAmount: 2,
  learned: '早い段階で確認することが重要だった。',
  issue: '',
  nextAction: '指摘を修正する。',
};

test('所有者は日次実績を登録・一覧・詳細・更新・アーカイブできる', async () => {
  const service = new DailyRecordService(new DailyRecords(), new Logs());
  expect((await service.create('owner', input)).ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect((await service.find('owner', '1')).ok).toBe(true);
  expect(
    (await service.update('owner', '1', { ...input, workMinutes: 60 })).ok,
  ).toBe(true);
  expect(await service.archive('owner', '1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});

test('別ユーザーは日次実績と所有者の目標を利用できない', async () => {
  const repository = new DailyRecords();
  const service = new DailyRecordService(repository, new Logs());
  await service.create('owner', input);
  expect((await service.find('other', '1')).ok).toBe(false);
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', '1')).toBe(false);
  expect((await service.create('other', input)).ok).toBe(false);
});

test('未来日と1,440分を超える作業時間を拒否する', async () => {
  const service = new DailyRecordService(new DailyRecords(), new Logs());
  expect(
    (
      await service.create('owner', {
        ...input,
        activityDate: new Date('2999-01-01'),
      })
    ).ok,
  ).toBe(false);
  expect(
    (await service.create('owner', { ...input, workMinutes: 1441 })).ok,
  ).toBe(false);
});

test('異なる目標のマイルストーンを拒否する', async () => {
  const service = new DailyRecordService(new DailyRecords(), new Logs());
  expect(
    (await service.create('owner', { ...input, milestoneId: 'other' })).ok,
  ).toBe(false);
});

test('実施内容と0以上の進捗量を検証する', async () => {
  const service = new DailyRecordService(new DailyRecords(), new Logs());
  expect(
    (await service.create('owner', { ...input, description: '' })).ok,
  ).toBe(false);
  expect(
    (await service.create('owner', { ...input, progressAmount: -1 })).ok,
  ).toBe(false);
});
