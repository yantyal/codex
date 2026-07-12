import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  AuthRepository,
  AuthUser,
  PasswordHasher,
} from '../../domain/auth/auth.js';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export type AuthResult =
  | {
      ok: true;
      user: Omit<AuthUser, 'passwordHash'>;
      sessionToken: string;
      csrfToken: string;
    }
  | { ok: false; status: 400 | 401 | 409; message: string };

/** 登録・ログイン・ログアウトとセッション検証を行う。 */
export class AuthService {
  /**
   * 認証サービスを作成する。
   * @param repository 利用者とセッションの保存先を指定する。
   * @param passwordHasher パスワード保護処理を指定する。
   * @returns AuthServiceのインスタンスを返す。
   * @remarks 認証情報をログへ出力しない。
   */
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  /** 新規利用者を登録してログイン済みセッションを作成する。 */
  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (
      !name ||
      name.length > 100 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      input.password.length < 8
    ) {
      return {
        ok: false,
        status: 400,
        message:
          '名前、正しいメールアドレス、8文字以上のパスワードを入力してください。',
      };
    }
    const user: AuthUser = {
      id: randomUUID(),
      name,
      email,
      passwordHash: await this.passwordHasher.hash(input.password),
    };
    if (!(await this.repository.createUserWithDefaults(user))) {
      return {
        ok: false,
        status: 409,
        message: 'このメールアドレスは既に登録されています。',
      };
    }
    return this.issueSession(user);
  }

  /** メールアドレスとパスワードを検証してセッションを作成する。 */
  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(
      input.email.trim().toLowerCase(),
    );
    if (
      !user ||
      !(await this.passwordHasher.verify(input.password, user.passwordHash))
    ) {
      return {
        ok: false,
        status: 401,
        message: 'メールアドレスまたはパスワードが正しくありません。',
      };
    }
    return this.issueSession(user);
  }

  /** セッションIDを検証して認証済み利用者を取得する。 */
  async authenticate(
    sessionToken: string | undefined,
  ): Promise<Omit<AuthUser, 'passwordHash'> | null> {
    if (!sessionToken) return null;
    const found = await this.repository.findSession(
      digest(sessionToken),
      new Date(),
    );
    return found
      ? { id: found.user.id, name: found.user.name, email: found.user.email }
      : null;
  }

  /** CSRFトークンを検証して現在のセッションを削除する。 */
  async logout(
    sessionToken: string | undefined,
    csrfToken: string | undefined,
  ): Promise<boolean> {
    if (!sessionToken || !csrfToken) return false;
    const tokenHash = digest(sessionToken);
    const found = await this.repository.findSession(tokenHash, new Date());
    if (!found || found.session.csrfTokenHash !== digest(csrfToken))
      return false;
    await this.repository.deleteSession(tokenHash);
    return true;
  }

  /** 利用者に対して推測困難なセッションとCSRFトークンを発行する。 */
  private async issueSession(
    user: AuthUser,
  ): Promise<Extract<AuthResult, { ok: true }>> {
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    await this.repository.createSession({
      userId: user.id,
      tokenHash: digest(sessionToken),
      csrfTokenHash: digest(csrfToken),
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    });
    return {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
      sessionToken,
      csrfToken,
    };
  }
}
