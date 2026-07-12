/** 認証対象の利用者を表す。 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

/** サーバー側で管理するセッションを表す。 */
export type AuthSession = {
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
};

/** 利用者とセッションを永続化する境界を表す。 */
export interface AuthRepository {
  /** メールアドレスから有効な利用者を取得する。 */
  findUserByEmail(email: string): Promise<AuthUser | null>;
  /** 利用者と既定設定を一括作成し、重複時はfalseを返す。 */
  createUserWithDefaults(user: AuthUser): Promise<boolean>;
  /** 新しいセッションを保存する。 */
  createSession(session: AuthSession): Promise<void>;
  /** ハッシュ化済みIDから有効なセッションと利用者を取得する。 */
  findSession(
    tokenHash: string,
    now: Date,
  ): Promise<{ session: AuthSession; user: AuthUser } | null>;
  /** ハッシュ化済みIDに一致するセッションを削除する。 */
  deleteSession(tokenHash: string): Promise<void>;
}

/** パスワードを安全にハッシュ化して検証する境界を表す。 */
export interface PasswordHasher {
  /** 平文パスワードを保存用の値へ変換する。 */
  hash(password: string): Promise<string>;
  /** 平文パスワードと保存済みハッシュが一致するか検証する。 */
  verify(password: string, passwordHash: string): Promise<boolean>;
}
