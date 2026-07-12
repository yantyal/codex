import type {
  AuditEvent,
  AuditLogger,
} from './apps/api/src/domain/authorization/ownership';
import type { CareerSkillRepository } from './apps/api/src/domain/career-skill/career-skill';
import { CareerSkillService } from './apps/api/src/application/career-skill/career-skill-service';
class Repo implements CareerSkillRepository {
  async replaceOwnedLinks(userId: string, goalId: string, ids: string[]) {
    return (
      userId === 'owner' && goalId === 'g1' && ids.every((id) => id === 's1')
    );
  }
  async listOwnedGaps(userId: string, goalId: string) {
    return userId === 'owner' && goalId === 'g1'
      ? [
          {
            skillId: 's1',
            name: 'TypeScript',
            currentLevel: 2,
            targetLevel: 5,
            gap: 3,
          },
        ]
      : null;
  }
}
class Log implements AuditLogger {
  events: AuditEvent[] = [];
  async write(e: AuditEvent) {
    this.events.push(e);
  }
}
test('所有する目標とスキルを関連付け差分を表示する', async () => {
  const service = new CareerSkillService(new Repo(), new Log());
  expect((await service.replace('owner', 'g1', ['s1', 's1'])).ok).toBe(true);
  expect(await service.gaps('owner', 'g1')).toEqual([
    expect.objectContaining({ currentLevel: 2, targetLevel: 5, gap: 3 }),
  ]);
});
test('別ユーザーの関連付けと差分表示を拒否する', async () => {
  const service = new CareerSkillService(new Repo(), new Log());
  expect((await service.replace('other', 'g1', ['s1'])).ok).toBe(false);
  expect(await service.gaps('other', 'g1')).toBeNull();
});
