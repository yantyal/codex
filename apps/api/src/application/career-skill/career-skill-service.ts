import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type { CareerSkillRepository } from '../../domain/career-skill/career-skill.js';
/** 同一所有者のキャリア目標とスキルを関連付けてレベル差分を返す。 */
export class CareerSkillService {
  constructor(
    private readonly repo: CareerSkillRepository,
    private readonly audit: AuditLogger,
  ) {}
  async replace(userId: string, goalId: string, skillIds: string[]) {
    const updated = await this.repo.replaceOwnedLinks(userId, goalId, [
      ...new Set(skillIds),
    ]);
    await this.log(userId, goalId, 'update', updated);
    return updated
      ? { ok: true as const }
      : {
          ok: false as const,
          message: '関連付けできる目標またはスキルが見つかりません。',
        };
  }
  async gaps(userId: string, goalId: string) {
    const value = await this.repo.listOwnedGaps(userId, goalId);
    await this.log(userId, goalId, 'read', value !== null);
    return value;
  }
  private async log(
    userId: string,
    id: string,
    action: 'read' | 'update',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'career-goal-skills',
      resourceId: id,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
