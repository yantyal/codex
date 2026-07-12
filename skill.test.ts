import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import type {
  Skill,
  SkillInput,
  SkillRepository,
} from './apps/api/src/domain/skill/skill';
import { SkillService } from './apps/api/src/application/skill/skill-service';
class Repo implements SkillRepository {
  values: Skill[] = [];
  async listOwned(userId: string) {
    return this.values.filter((x) => x.userId === userId && !x.archivedAt);
  }
  async findOwned(userId: string, id: string) {
    return (
      this.values.find(
        (x) => x.userId === userId && x.id === id && !x.archivedAt,
      ) ?? null
    );
  }
  async createOwned(userId: string, input: SkillInput) {
    const value = { ...input, id: 's1', userId, archivedAt: null };
    this.values.push(value);
    return value;
  }
  async updateOwned(userId: string, id: string, input: SkillInput) {
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
  async categoryIsOwnedAndActive(userId: string, categoryId: string) {
    return userId === 'owner' && categoryId === 'c1';
  }
}
class Log implements AuditLogger {
  events: AuditEvent[] = [];
  async write(event: AuditEvent) {
    this.events.push(event);
  }
}
const input: SkillInput = {
  categoryId: 'c1',
  name: 'TypeScript',
  currentLevel: 2,
  targetLevel: 4,
  criteria: '設計できる',
  notes: '',
};
test('現在・目標レベルと判定基準を登録してCRUDできる', async () => {
  const repo = new Repo();
  const service = new SkillService(repo, new Log());
  expect((await service.create('owner', input)).ok).toBe(true);
  expect(await service.list('owner')).toHaveLength(1);
  expect(
    (await service.update('owner', 's1', { ...input, currentLevel: 3 })).ok,
  ).toBe(true);
  expect(await service.archive('owner', 's1')).toBe(true);
  expect(await service.list('owner')).toEqual([]);
});
test('別ユーザーと無効な分類による操作を拒否する', async () => {
  const service = new SkillService(new Repo(), new Log());
  expect((await service.create('other', input)).ok).toBe(false);
  expect(await service.find('other', 's1')).toBeNull();
});
test('レベル範囲外を分かりやすく拒否する', async () => {
  const service = new SkillService(new Repo(), new Log());
  expect((await service.create('owner', { ...input, targetLevel: 6 })).ok).toBe(
    false,
  );
});
