import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import type {
  CategorySetting,
  LevelSetting,
  SkillSettingsRepository,
} from './apps/api/src/domain/skill-settings/skill-settings';
import { SkillSettingsService } from './apps/api/src/application/skill-settings/skill-settings-service';
class Repo implements SkillSettingsRepository {
  categories: CategorySetting[] = [
    {
      id: 'c1',
      userId: 'owner',
      name: '技術',
      displayOrder: 1,
      isActive: true,
    },
  ];
  levels: LevelSetting[] = Array.from({ length: 5 }, (_, i) => ({
    id: `l${i + 1}`,
    userId: 'owner',
    level: i + 1,
    name: `レベル ${i + 1}`,
    description: '',
  }));
  async getOwned(userId: string) {
    return {
      categories: this.categories.filter((x) => x.userId === userId),
      levels: this.levels.filter((x) => x.userId === userId),
    };
  }
  async createCategory(userId: string, name: string, displayOrder: number) {
    const value = { id: 'new', userId, name, displayOrder, isActive: true };
    this.categories.push(value);
    return value;
  }
  async updateCategory(
    userId: string,
    id: string,
    input: { name: string; displayOrder: number; isActive: boolean },
  ) {
    const value = this.categories.find(
      (x) => x.userId === userId && x.id === id,
    );
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }
  async updateLevel(
    userId: string,
    level: number,
    input: { name: string; description: string },
  ) {
    const value = this.levels.find(
      (x) => x.userId === userId && x.level === level,
    );
    if (!value) return null;
    Object.assign(value, input);
    return value;
  }
}
class Log implements AuditLogger {
  events: AuditEvent[] = [];
  async write(event: AuditEvent) {
    this.events.push(event);
  }
}
test('使用中の分類を削除せず無効化できる', async () => {
  const repo = new Repo();
  const result = await new SkillSettingsService(repo, new Log()).updateCategory(
    'owner',
    'c1',
    { name: '技術', displayOrder: 1, isActive: false },
  );
  expect(result.ok).toBe(true);
  expect(repo.categories[0].isActive).toBe(false);
});
test('レベル数を変えず説明を更新できる', async () => {
  const repo = new Repo();
  const result = await new SkillSettingsService(repo, new Log()).updateLevel(
    'owner',
    3,
    { name: '自立', description: '支援なしで遂行できる' },
  );
  expect(result.ok).toBe(true);
  expect(repo.levels).toHaveLength(5);
  expect(repo.levels[2].description).toBe('支援なしで遂行できる');
});
test('別ユーザーは分類とレベルを更新できない', async () => {
  const repo = new Repo();
  const service = new SkillSettingsService(repo, new Log());
  expect(
    (
      await service.updateCategory('other', 'c1', {
        name: '不正',
        displayOrder: 1,
        isActive: false,
      })
    ).ok,
  ).toBe(false);
  expect(
    (await service.updateLevel('other', 1, { name: '不正', description: '' }))
      .ok,
  ).toBe(false);
});
