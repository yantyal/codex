import request from 'supertest';
import type {
  AuthRepository,
  AuthSession,
  AuthUser,
} from './apps/api/src/domain/auth/auth';
import { AuthService } from './apps/api/src/application/auth/auth-service';
import { ScryptPasswordHasher } from './apps/api/src/infrastructure/security/scrypt-password-hasher';
import { createApiApp } from './apps/api/src/bootstrap/app';

/** 認証テスト中だけ利用者とセッションをメモリへ保存する。 */
class InMemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, AuthUser>();
  readonly sessions = new Map<string, AuthSession>();

  /** メールアドレスに一致する利用者を取得する。 */
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    return (
      [...this.users.values()].find((user) => user.email === email) ?? null
    );
  }

  /** 利用者と既定設定を一括作成したものとして保存する。 */
  async createUserWithDefaults(user: AuthUser): Promise<boolean> {
    if (await this.findUserByEmail(user.email)) return false;
    this.users.set(user.id, user);
    return true;
  }

  /** セッションをメモリへ保存する。 */
  async createSession(session: AuthSession): Promise<void> {
    this.sessions.set(session.tokenHash, session);
  }

  /** 有効期限内のセッションと所有者を取得する。 */
  async findSession(tokenHash: string, now: Date) {
    const session = this.sessions.get(tokenHash);
    const user = session ? this.users.get(session.userId) : undefined;
    return session && user && session.expiresAt > now
      ? { session, user }
      : null;
  }

  /** 指定したセッションだけを削除する。 */
  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }
}

describe('AuthService', () => {
  test('登録時に平文パスワードを保存せず既定セッションを発行する', async () => {
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository, new ScryptPasswordHasher());

    const result = await service.register({
      name: '利用者',
      email: 'USER@example.com',
      password: 'password123',
    });

    expect(result.ok).toBe(true);
    const savedUser = [...repository.users.values()][0];
    expect(savedUser.passwordHash).not.toContain('password123');
    expect(savedUser.passwordHash).toMatch(/^scrypt:/);
    expect(savedUser.email).toBe('user@example.com');
  });

  test('誤ったパスワードでは利用者を特定しない共通エラーを返す', async () => {
    const repository = new InMemoryAuthRepository();
    const service = new AuthService(repository, new ScryptPasswordHasher());
    await service.register({
      name: '利用者',
      email: 'user@example.com',
      password: 'password123',
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'incorrect',
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'メールアドレスまたはパスワードが正しくありません。',
    });
  });
});

describe('authentication API', () => {
  test('認証前の画面用APIアクセスを拒否する', async () => {
    const app = createApiApp(
      new AuthService(new InMemoryAuthRepository(), new ScryptPasswordHasher()),
    );

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'ログインしてください。' });
  });

  test('ログインCookieをHttpOnlyかつSameSite Strictで発行する', async () => {
    const app = createApiApp(
      new AuthService(new InMemoryAuthRepository(), new ScryptPasswordHasher()),
    );

    const response = await request(app).post('/api/auth/register').send({
      name: '利用者',
      email: 'user@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('password123');
  });
});
