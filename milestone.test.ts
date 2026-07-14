import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import { MilestoneService } from './apps/api/src/application/milestone/milestone-service';
import type {
  Milestone,
  MilestoneInput,
  MilestoneRepository,
} from './apps/api/src/domain/milestone/milestone';

/** テスト中だけマイルストーンと利用可能な目標をメモリへ保存する。 */
class Milestones implements MilestoneRepository {
  values: Milestone[] = [];

  /**
   * 所有者のマイルストーン型目標か確認する。
   * @param userId 確認する利用者ID
   * @param goalId 確認する目標ID
   * @returns ownerのgoal-1の場合はtrue
   */
  async goalCanUseMilestones(userId: string, goalId: string) {
    return userId === 'owner' && goalId === 'goal-1';
  }

  /**
   * 所有する目標の有効なマイルストーンを期限順で返す。
   * @param userId 一覧を取得する利用者ID
   * @param goalId 一覧を取得する目標ID
   * @returns 条件に一致するマイルストーンの配列
   */
  async listOwned(userId: string, goalId: string) {
    if (!(await this.goalCanUseMilestones(userId, goalId))) return [];
    return this.values
      .filter((value) => value.goalId === goalId && !value.archivedAt)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
  }

  /**
   * 所有者、目標、IDが一致するマイルストーンを返す。
   * @param userId 取得する利用者ID
   * @param goalId 親目標ID
   * @param id マイルストーンID
   * @returns 一致するマイルストーン、またはnull
   */
  async findOwned(userId: string, goalId: string, id: string) {
    if (!(await this.goalCanUseMilestones(userId, goalId))) return null;
    return (
      this.values.find(
        (value) =>
          value.id === id && value.goalId === goalId && !value.archivedAt,
      ) ?? null
    );
  }

  /**
   * テスト用IDを付けてマイルストーンを保存する。
   * @param userId 登録する利用者ID
   * @param input 登録する入力値
   * @returns 登録したマイルストーン
   */
  async createOwned(_userId: string, input: MilestoneInput) {
    const value = {
      ...input,
      id: `${this.values.length + 1}`,
      archivedAt: null,
    };
    this.values.push(value);
    return value;
  }

  /**
   * 所有するマイルストーンだけを更新する。
   * @param userId 更新する利用者ID
   * @param id マイルストーンID
   * @param input 更新後の入力値
   * @returns 更新値、またはnull
   */
  async updateOwned(userId: string, id: string, input: MilestoneInput) {
    const value = await this.findOwned(userId, input.goalId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }

  /**
   * 所有するマイルストーンを物理削除せずアーカイブする。
   * @param userId 操作する利用者ID
   * @param goalId 親目標ID
   * @param id マイルストーンID
   * @returns 更新できた場合はtrue
   */
  async archiveOwned(userId: string, goalId: string, id: string) {
    const value = await this.findOwned(userId, goalId, id);
    if (!value) return false;
    value.archivedAt = new Date();
    return true;
  }
}

/** テストで認可結果を確認できるように監査イベントをメモリへ保存する。 */
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

const input: MilestoneInput = {
  goalId: 'goal-1',
  name: '設計レビューを完了する',
  dueDate: new Date('2026-08-31'),
  completionCondition: '関係者全員の承認を得る。',
  weight: 30,
  status: 'in_progress',
  completedDate: null,
};

test('所有者はマイルストーンを登録・一覧・詳細・更新・アーカイブできる', async () => {
  const repository = new Milestones();
  const service = new MilestoneService(repository, new Logs());

  expect((await service.create('owner', input)).ok).toBe(true);
  expect((await service.list('owner', 'goal-1')).ok).toBe(true);
  expect((await service.find('owner', 'goal-1', '1')).ok).toBe(true);
  expect(
    (await service.update('owner', '1', { ...input, name: '更新後' })).ok,
  ).toBe(true);
  expect(await service.archive('owner', 'goal-1', '1')).toBe(true);
  expect(await service.list('owner', 'goal-1')).toEqual({
    ok: true,
    items: [],
  });
});

test('別ユーザーはマイルストーンを参照・更新・アーカイブできない', async () => {
  const repository = new Milestones();
  const service = new MilestoneService(repository, new Logs());
  await service.create('owner', input);

  expect((await service.list('other', 'goal-1')).ok).toBe(false);
  expect((await service.find('other', 'goal-1', '1')).ok).toBe(false);
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', 'goal-1', '1')).toBe(false);
});

test('名称、期限、正の重みを検証する', async () => {
  const service = new MilestoneService(new Milestones(), new Logs());

  expect((await service.create('owner', { ...input, name: '' })).ok).toBe(
    false,
  );
  expect(
    (await service.create('owner', { ...input, dueDate: new Date('') })).ok,
  ).toBe(false);
  expect((await service.create('owner', { ...input, weight: 0 })).ok).toBe(
    false,
  );
});

test('完了状態では完了日を必須にする', async () => {
  const service = new MilestoneService(new Milestones(), new Logs());

  expect(
    (
      await service.create('owner', {
        ...input,
        status: 'completed',
        completedDate: null,
      })
    ).ok,
  ).toBe(false);
});

test('未完了へ戻すと完了日を未設定へ戻す', async () => {
  const service = new MilestoneService(new Milestones(), new Logs());
  const result = await service.create('owner', {
    ...input,
    completedDate: new Date('2026-08-20'),
  });

  expect(result.ok && result.value.completedDate).toBeNull();
});
