import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import { GoalService } from './apps/api/src/application/goal/goal-service';
import {
  SmartGoalEvaluator,
  type Goal,
  type GoalInput,
  type GoalRepository,
} from './apps/api/src/domain/goal/goal';

/** テスト中だけ実行目標をメモリへ保存する。 */
class Goals implements GoalRepository {
  values: Goal[] = [];

  /**
   * 所有者の有効な目標を期限順で返す。
   * @param userId 一覧を取得する利用者ID
   * @returns 所有者に一致する目標の配列
   */
  async listOwned(userId: string) {
    return this.values
      .filter((goal) => goal.userId === userId && !goal.archivedAt)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
  }

  /**
   * 所有者とIDが一致する有効な目標を返す。
   * @param userId 目標を所有する利用者ID
   * @param id 取得する目標ID
   * @returns 一致する目標、またはnull
   */
  async findOwned(userId: string, id: string) {
    return (
      this.values.find(
        (goal) => goal.id === id && goal.userId === userId && !goal.archivedAt,
      ) ?? null
    );
  }

  /**
   * ロードマップ項目が未選択または所有者の有効な項目か確認する。
   * @param userId 確認する利用者ID
   * @param roadmapItemId 確認するロードマップ項目ID、またはnull
   * @returns 利用可能な場合はtrue
   */
  async roadmapItemIsOwned(userId: string, roadmapItemId: string | null) {
    return (
      roadmapItemId === null ||
      (userId === 'owner' && roadmapItemId === 'roadmap-1')
    );
  }

  /**
   * 評価期間が未選択または所有者の有効な期間か確認する。
   * @param userId 確認する利用者ID
   * @param evaluationPeriodId 確認する評価期間ID、またはnull
   * @returns 利用可能な場合はtrue
   */
  async evaluationPeriodIsOwned(
    userId: string,
    evaluationPeriodId: string | null,
  ) {
    return (
      evaluationPeriodId === null ||
      (userId === 'owner' && evaluationPeriodId === 'period-1')
    );
  }

  /**
   * 新しい目標へテスト用IDを付けて保存する。
   * @param userId 目標を所有する利用者ID
   * @param input 登録する入力値
   * @returns 登録した目標
   */
  async createOwned(userId: string, input: GoalInput) {
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
   * 所有者の目標だけを更新する。
   * @param userId 目標を所有する利用者ID
   * @param id 更新する目標ID
   * @param input 更新後の入力値
   * @returns 更新した目標、またはnull
   */
  async updateOwned(userId: string, id: string, input: GoalInput) {
    const value = await this.findOwned(userId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }

  /**
   * 所有者の目標を物理削除せずアーカイブする。
   * @param userId 目標を所有する利用者ID
   * @param id アーカイブする目標ID
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

const input: GoalInput = {
  roadmapItemId: 'roadmap-1',
  evaluationPeriodId: 'period-1',
  name: '設計レビューを改善する',
  description:
    '現在のレビュー課題を整理し、段階的な改善手順でチームへ定着させる。',
  category: 'チーム貢献',
  calculationType: 'numeric',
  startDate: new Date('2026-08-01'),
  dueDate: new Date('2026-09-30'),
  completionCondition: 'レビュー指摘の手戻り件数を月5件以下にする。',
  measurementMethod: '毎月のレビュー指摘と手戻り件数を集計する。',
  targetValue: 5,
  currentValue: 12,
  unit: '件',
  plannedDays: null,
  manualProgress: null,
  manualReason: '',
  priority: 'high',
  weight: 30,
  status: 'in_progress',
};

test('所有者は目標を登録・一覧・詳細・更新・アーカイブできる', async () => {
  const repository = new Goals();
  const service = new GoalService(repository, new Logs());

  expect((await service.create('owner', input)).ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect((await service.find('owner', '1')).ok).toBe(true);
  expect(
    (await service.update('owner', '1', { ...input, name: '更新後' })).ok,
  ).toBe(true);
  expect(await service.archive('owner', '1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});

test('別ユーザーは目標や関連データを利用できない', async () => {
  const repository = new Goals();
  const service = new GoalService(repository, new Logs());
  await service.create('owner', input);

  expect((await service.find('other', '1')).ok).toBe(false);
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', '1')).toBe(false);
  expect((await service.create('other', input)).ok).toBe(false);
});

test('数値型では正の目標値を必須にする', async () => {
  const service = new GoalService(new Goals(), new Logs());

  expect(await service.create('owner', { ...input, targetValue: 0 })).toEqual({
    ok: false,
    message: '数値型は0より大きい目標値、0以上の現在値、単位が必要です。',
  });
});

test('習慣型と手動型の条件付き入力を検証する', async () => {
  const service = new GoalService(new Goals(), new Logs());

  expect(
    (
      await service.create('owner', {
        ...input,
        calculationType: 'habit',
        plannedDays: 0,
      })
    ).ok,
  ).toBe(false);
  expect(
    (
      await service.create('owner', {
        ...input,
        calculationType: 'manual',
        manualProgress: 50,
        manualReason: '',
      })
    ).ok,
  ).toBe(false);
});

test('SMART警告が残っていても目標を保存できる', async () => {
  const service = new GoalService(new Goals(), new Logs());
  const result = await service.create('owner', {
    ...input,
    roadmapItemId: null,
    evaluationPeriodId: null,
    description: '短い説明',
  });

  expect(result.ok).toBe(true);
  expect(result.ok && result.warnings.map(({ aspect }) => aspect)).toEqual(
    expect.arrayContaining(['achievable', 'relevant']),
  );
});

test('5観点を満たす目標にはSMART警告を返さない', () => {
  expect(SmartGoalEvaluator.evaluate(input)).toEqual([]);
});
