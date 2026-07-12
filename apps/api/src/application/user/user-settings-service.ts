import { randomUUID } from 'node:crypto';
import type {
  NewUserSettings,
  UserSettingsRepository,
} from '../../domain/user/user-settings.js';

export type UserSettingsResult =
  { ok: true; settings: NewUserSettings } | { ok: false; message: string };

/** 新規ユーザーの分類とレベル初期値を準備する。 */
export class UserSettingsService {
  /**
   * ユーザー設定サービスを作成する。
   * @param repository ユーザー所有データを扱うリポジトリを指定する。
   * @returns UserSettingsServiceのインスタンスを返す。
   * @remarks リポジトリには所有者IDを必ず渡す。
   */
  constructor(private readonly repository: UserSettingsRepository) {}

  /**
   * 新規ユーザーと既定の分類・レベル1～5を作成する。
   * @param input ユーザー名、メールアドレス、ハッシュ化済みパスワードを指定する。
   * @returns 作成結果または利用者向け入力エラーを返す。
   * @remarks パスワードのハッシュ化自体は認証ユースケースで行う。
   */
  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserSettingsResult> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email || !input.passwordHash) {
      return {
        ok: false,
        message: '名前、メールアドレス、パスワードを入力してください。',
      };
    }

    const userId = randomUUID();
    const settings: NewUserSettings = {
      user: { id: userId, name, email, passwordHash: input.passwordHash },
      categories: [
        {
          id: randomUUID(),
          userId,
          name: '未分類',
          displayOrder: 1,
          isActive: true,
        },
      ],
      levels: Array.from({ length: 5 }, (_, index) => {
        const level = index + 1;
        return {
          id: randomUUID(),
          userId,
          level,
          name: `レベル ${level}`,
          description: `レベル ${level} の基準を設定してください。`,
        };
      }),
    };

    await this.repository.createWithDefaults(settings);
    return { ok: true, settings };
  }

  /**
   * 認証済みユーザーが所有する設定を取得する。
   * @param userId 認証済みユーザーIDを指定する。
   * @returns 設定一覧または利用者向けの空状態メッセージを返す。
   * @remarks 別ユーザーのIDへ置き換えず、認証情報から得たIDを渡す。
   */
  async findOwned(userId: string): Promise<
    | {
        ok: true;
        categories: NewUserSettings['categories'];
        levels: NewUserSettings['levels'];
      }
    | { ok: false; message: string }
  > {
    const settings = await this.repository.findByUserId(userId);
    if (!settings) {
      return { ok: false, message: '設定はまだありません。' };
    }
    return { ok: true, ...settings };
  }

  /**
   * 認証済みユーザーが所有する分類名を更新する。
   * @param userId 認証済みユーザーIDを指定する。
   * @param categoryId 更新対象の分類IDを指定する。
   * @param name 新しい分類名を指定する。
   * @returns 更新結果または利用者向けエラーを返す。
   * @remarks 所有者が一致しない対象の存在を利用者へ明かさない。
   */
  async updateOwnedCategory(
    userId: string,
    categoryId: string,
    name: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { ok: false, message: '分類名を入力してください。' };
    }
    const updated = await this.repository.updateCategoryName(
      userId,
      categoryId,
      normalizedName,
    );
    return updated
      ? { ok: true }
      : { ok: false, message: '更新できる分類が見つかりません。' };
  }
}
