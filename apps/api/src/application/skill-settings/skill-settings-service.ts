import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type { SkillSettingsRepository } from '../../domain/skill-settings/skill-settings.js';

/** スキル分類と固定レベル1～5の設定を所有者単位で管理する。 */
export class SkillSettingsService {
  constructor(
    private readonly repository: SkillSettingsRepository,
    private readonly audit: AuditLogger,
  ) {}
  async get(userId: string) {
    return this.repository.getOwned(userId);
  }
  async createCategory(userId: string, name: string, displayOrder: number) {
    const normalized = name.trim();
    if (!normalized || normalized.length > 100)
      return {
        ok: false as const,
        message: '分類名を1～100文字で入力してください。',
      };
    return {
      ok: true as const,
      value: await this.repository.createCategory(
        userId,
        normalized,
        displayOrder,
      ),
    };
  }
  async updateCategory(
    userId: string,
    id: string,
    input: { name: string; displayOrder: number; isActive: boolean },
  ) {
    const normalized = input.name.trim();
    if (!normalized || normalized.length > 100)
      return {
        ok: false as const,
        message: '分類名を1～100文字で入力してください。',
      };
    const value = await this.repository.updateCategory(userId, id, {
      ...input,
      name: normalized,
    });
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: '分類が見つかりません。' };
  }
  async updateLevel(
    userId: string,
    level: number,
    input: { name: string; description: string },
  ) {
    if (
      level < 1 ||
      level > 5 ||
      !input.name.trim() ||
      input.name.length > 100 ||
      input.description.length > 500
    )
      return {
        ok: false as const,
        message: 'レベル1～5の名称100文字、説明500文字以内で入力してください。',
      };
    const value = await this.repository.updateLevel(userId, level, {
      name: input.name.trim(),
      description: input.description.trim(),
    });
    await this.log(userId, String(level), 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: 'レベル定義が見つかりません。' };
  }
  private async log(
    userId: string,
    id: string,
    action: 'update',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'skill-setting',
      resourceId: id,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
