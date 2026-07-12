import type {
  AuditLogger,
  AuditEvent,
} from './apps/api/src/domain/authorization/ownership';
import type {
  CareerGoal,
  CareerGoalInput,
  CareerGoalRepository,
} from './apps/api/src/domain/career/career-goal';
import { CareerGoalService } from './apps/api/src/application/career/career-goal-service';

class Goals implements CareerGoalRepository {
  values: CareerGoal[] = [];
  async listOwned(userId: string) {
    return this.values.filter((x) => x.userId === userId && !x.archivedAt);
  }
  async findOwned(userId: string, id: string) {
    return this.values.find((x) => x.userId === userId && x.id === id) ?? null;
  }
  async createOwned(userId: string, input: CareerGoalInput) {
    const value = {
      ...input,
      id: `${this.values.length + 1}`,
      userId,
      archivedAt: null,
    };
    this.values.push(value);
    return value;
  }
  async updateOwned(userId: string, id: string, input: CareerGoalInput) {
    const value = await this.findOwned(userId, id);
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }
  async archiveOwned(userId: string, id: string) {
    const value = await this.findOwned(userId, id);
    if (!value) return false;
    value.archivedAt = new Date();
    return true;
  }
}
class Logs implements AuditLogger {
  events: AuditEvent[] = [];
  async write(event: AuditEvent) {
    this.events.push(event);
  }
}
const input: CareerGoalInput = {
  name: 'テックリードになる',
  targetRole: 'テックリード',
  dueDate: new Date('2027-03-31'),
  reason: '成長',
  currentState: '担当者',
  targetState: 'チームを牽引',
  priority: 'high',
  status: 'in_progress',
};

test('所有者は登録・一覧・詳細・更新・アーカイブできる', async () => {
  const repo = new Goals();
  const service = new CareerGoalService(repo, new Logs());
  const created = await service.create('owner', input);
  expect(created.ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect(await service.find('owner', '1')).not.toBeNull();
  expect(
    (await service.update('owner', '1', { ...input, name: '更新後' })).ok,
  ).toBe(true);
  expect(await service.archive('owner', '1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});
test('別ユーザーは詳細・更新・アーカイブできない', async () => {
  const repo = new Goals();
  const logs = new Logs();
  const service = new CareerGoalService(repo, logs);
  await service.create('owner', input);
  expect(await service.find('other', '1')).toBeNull();
  expect((await service.update('other', '1', input)).ok).toBe(false);
  expect(await service.archive('other', '1')).toBe(false);
  expect(logs.events.every(({ outcome }) => outcome === 'denied')).toBe(true);
});
test('必須入力エラーを分かりやすく返す', async () => {
  const service = new CareerGoalService(new Goals(), new Logs());
  expect(await service.create('owner', { ...input, name: '' })).toEqual({
    ok: false,
    message: '目標名と目指す役割を入力してください。',
  });
});
