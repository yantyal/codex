import { randomUUID } from 'node:crypto';
import type {
  AuthRepository,
  AuthSession,
  AuthUser,
} from '../../domain/auth/auth.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って認証情報をMySQLへ保存する。 */
export class PrismaAuthRepository implements AuthRepository {
  /**
   * Prisma認証リポジトリを作成する。
   * @param prisma 接続済みのPrismaクライアントを指定する。
   * @returns PrismaAuthRepositoryのインスタンスを返す。
   * @remarks 接続の終了は起動処理側で管理する。
   */
  constructor(private readonly prisma: PrismaClient) {}

  /** メールアドレスから削除されていない利用者を取得する。 */
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
  }

  /** 利用者、未分類、レベル1～5を同一トランザクションで作成する。 */
  async createUserWithDefaults(user: AuthUser): Promise<boolean> {
    try {
      await this.prisma.user.create({
        data: {
          ...user,
          skillCategories: {
            create: [{ id: randomUUID(), name: '未分類', displayOrder: 1 }],
          },
          skillLevels: {
            create: Array.from({ length: 5 }, (_, index) => ({
              id: randomUUID(),
              level: index + 1,
              name: `レベル ${index + 1}`,
              description: `レベル ${index + 1} の基準を設定してください。`,
            })),
          },
        },
      });
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        return false;
      throw error;
    }
  }

  /** ハッシュ化したセッション情報を保存する。 */
  async createSession(session: AuthSession): Promise<void> {
    await this.prisma.session.create({ data: session });
  }

  /** 有効なセッションとその所有者を取得する。 */
  async findSession(tokenHash: string, now: Date) {
    const record = await this.prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: now }, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!record) return null;
    return {
      session: {
        userId: record.userId,
        tokenHash: record.tokenHash,
        csrfTokenHash: record.csrfTokenHash,
        expiresAt: record.expiresAt,
      },
      user: {
        id: record.user.id,
        name: record.user.name,
        email: record.user.email,
        passwordHash: record.user.passwordHash,
      },
    };
  }

  /** 指定したセッションだけを削除する。 */
  async deleteSession(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
