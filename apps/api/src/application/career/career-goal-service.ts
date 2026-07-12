import type { AuditLogger } from '../../domain/authorization/ownership.js';
import type {
  CareerGoalInput,
  CareerGoalRepository,
} from '../../domain/career/career-goal.js';

/** キャリア目標の登録・一覧・詳細・更新・アーカイブを処理する。 */
export class CareerGoalService {
  constructor(
    private readonly repository: CareerGoalRepository,
    private readonly audit: AuditLogger,
  ) {}
  async list(userId: string) {
    return this.repository.listOwned(userId);
  }
  async find(userId: string, id: string) {
    const value = await this.repository.findOwned(userId, id);
    await this.log(userId, id, 'read', Boolean(value));
    return value;
  }
  async create(userId: string, input: CareerGoalInput) {
    const message = this.validate(input);
    if (message) return { ok: false as const, message };
    return {
      ok: true as const,
      value: await this.repository.createOwned(userId, input),
    };
  }
  async update(userId: string, id: string, input: CareerGoalInput) {
    const message = this.validate(input);
    if (message) return { ok: false as const, message };
    const value = await this.repository.updateOwned(userId, id, input);
    await this.log(userId, id, 'update', Boolean(value));
    return value
      ? { ok: true as const, value }
      : { ok: false as const, message: 'キャリア目標が見つかりません。' };
  }
  async archive(userId: string, id: string) {
    const archived = await this.repository.archiveOwned(userId, id);
    await this.log(userId, id, 'delete', archived);
    return archived;
  }
  private validate(input: CareerGoalInput) {
    if (!input.name?.trim() || !input.targetRole?.trim())
      return '目標名と目指す役割を入力してください。';
    if (
      !(input.dueDate instanceof Date) ||
      Number.isNaN(input.dueDate.getTime())
    )
      return '正しい期限を入力してください。';
    return null;
  }
  private async log(
    userId: string,
    resourceId: string,
    action: 'read' | 'update' | 'delete',
    allowed: boolean,
  ) {
    await this.audit.write({
      actorUserId: userId,
      action,
      resourceType: 'career-goal',
      resourceId,
      outcome: allowed ? 'allowed' : 'denied',
    });
  }
}
