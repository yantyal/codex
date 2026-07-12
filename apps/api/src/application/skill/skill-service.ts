import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type { SkillInput, SkillRepository } from '../../domain/skill/skill.js';
/** 所有者単位でスキルのCRUDとレベル検証を行う。 */
export class SkillService {
  constructor(
    private readonly repo: SkillRepository,
    private readonly audit: AuditLogger,
  ) {}
  async list(userId: string) {
    return this.repo.listOwned(userId);
  }
  async find(userId: string, id: string) {
    const value = await this.repo.findOwned(userId, id);
    await this.log(userId, id, 'read', !!value);
    return value;
  }
  async create(userId: string, input: SkillInput) {
    const error = await this.validate(userId, input);
    return error
      ? { ok: false as const, message: error }
      : {
          ok: true as const,
          value: await this.repo.createOwned(userId, input),
        };
  }
  async update(userId: string, id: string, input: SkillInput) {
    const error = await this.validate(userId, input);
    if (error) return { ok: false as const, message: error };
    const value = await this.repo.updateOwned(userId, id, input);
    await this.log(userId, id, 'update', !!value);
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: 'スキルが見つかりません。' };
  }
  async archive(userId: string, id: string) {
    const value = await this.repo.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', value);
    return value;
  }
  private async validate(userId: string, input: SkillInput) {
    if (!input.name.trim() || input.name.length > 200)
      return 'スキル名を1～200文字で入力してください。';
    if (
      ![input.currentLevel, input.targetLevel].every(
        (x) => Number.isInteger(x) && x >= 1 && x <= 5,
      )
    )
      return '現在・目標レベルは1～5で入力してください。';
    if (!(await this.repo.categoryIsOwnedAndActive(userId, input.categoryId)))
      return '選択できる分類が見つかりません。';
    return null;
  }
  private async log(
    userId: string,
    id: string,
    action: 'read' | 'update' | 'delete',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'skill',
      resourceId: id,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
