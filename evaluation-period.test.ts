import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import { EvaluationPeriodService } from './apps/api/src/application/evaluation/evaluation-period-service';
import type {
  EvaluationPeriod,
  EvaluationPeriodInput,
  EvaluationPeriodRepository,
} from './apps/api/src/domain/evaluation/evaluation-period';

/** テスト中だけ評価期間をメモリへ保存する。 */
class EvaluationPeriods implements EvaluationPeriodRepository {
  values: EvaluationPeriod[] = [];

  /**
   * 所有者の有効な評価期間を開始日の新しい順で返す。
   * @param userId 一覧を取得する利用者ID
   * @returns 所有者に一致する評価期間の配列
   */
  async listOwned(userId: string) {
    return this.values
      .filter((period) => period.userId === userId && !period.archivedAt)
      .sort(
        (left, right) => right.startDate.getTime() - left.startDate.getTime(),
      );
  }

  /**
   * 所有者とIDが一致する有効な評価期間を返す。
   * @param userId 評価期間を所有する利用者ID
   * @param id 取得する評価期間ID
   * @returns 一致する評価期間、またはnull
   */
  async findOwned(userId: string, id: string) {
    return (
      this.values.find(
        (period) =>
          period.id === id && period.userId === userId && !period.archivedAt,
      ) ?? null
    );
  }

  /**
   * 新しい評価期間へテスト用IDを付けて保存する。
   * @param userId 評価期間を所有する利用者ID
   * @param input 登録する入力値
   * @returns 登録した評価期間
   */
  async createOwned(userId: string, input: EvaluationPeriodInput) {
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
   * 所有者の評価期間だけを更新する。
   * @param userId 評価期間を所有する利用者ID
   * @param id 更新する評価期間ID
   * @param input 更新後の入力値
   * @returns 更新した評価期間、またはnull
   */
  async updateOwned(userId: string, id: string, input: EvaluationPeriodInput) {
    const value = await this.findOwned(userId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }

  /**
   * 所有者の評価期間を物理削除せずアーカイブする。
   * @param userId 評価期間を所有する利用者ID
   * @param id アーカイブする評価期間ID
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

const input: EvaluationPeriodInput = {
  name: '2026年度 上期',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-09-30'),
  theme: '設計力とチーム貢献を高める',
};

test('所有者は評価期間を登録・一覧・詳細・更新・アーカイブできる', async () => {
  const repository = new EvaluationPeriods();
  const service = new EvaluationPeriodService(repository, new Logs());

  expect((await service.create('owner', input)).ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect(await service.find('owner', '1')).not.toBeNull();
  expect(
    (await service.update('owner', '1', { ...input, name: '更新後' })).ok,
  ).toBe(true);
  expect(await service.archive('owner', '1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});

test('別ユーザーは詳細・更新・アーカイブできない', async () => {
  const repository = new EvaluationPeriods();
  const logs = new Logs();
  const service = new EvaluationPeriodService(repository, logs);
  await service.create('owner', input);

  expect(await service.find('other', '1')).toBeNull();
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', '1')).toBe(false);
  expect(logs.events.every(({ outcome }) => outcome === 'denied')).toBe(true);
});

test('終了日が開始日より前の場合は分かりやすいエラーを返す', async () => {
  const service = new EvaluationPeriodService(
    new EvaluationPeriods(),
    new Logs(),
  );

  expect(
    await service.create('owner', {
      ...input,
      endDate: new Date('2026-03-31'),
    }),
  ).toEqual({
    ok: false,
    message: '終了日は開始日以降にしてください。',
  });
});

test('期間名が空の場合は入力を促す', async () => {
  const service = new EvaluationPeriodService(
    new EvaluationPeriods(),
    new Logs(),
  );

  expect(await service.create('owner', { ...input, name: '' })).toEqual({
    ok: false,
    message: '期間名を1～200文字で入力してください。',
  });
});
