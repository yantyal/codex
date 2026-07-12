import type {
  NewUserSettings,
  UserSettingsRepository,
} from './apps/api/src/domain/user/user-settings';
import { UserSettingsService } from './apps/api/src/application/user/user-settings-service';

/** テスト中だけユーザーごとの設定を保持するリポジトリを表す。 */
class InMemoryUserSettingsRepository implements UserSettingsRepository {
  private readonly settingsByUserId = new Map<string, NewUserSettings>();

  /**
   * ユーザーと初期設定をメモリへ保存する。
   * @param settings 保存するユーザー設定を指定する。
   * @returns 保存完了を表すPromiseを返す。
   * @remarks テスト用のためDBへは接続しない。
   */
  async createWithDefaults(settings: NewUserSettings): Promise<void> {
    this.settingsByUserId.set(settings.user.id, settings);
  }

  /**
   * 指定した所有者の設定だけをメモリから取得する。
   * @param userId 所有者のユーザーIDを指定する。
   * @returns 所有者の設定を返し、存在しない場合はnullを返す。
   * @remarks 別ユーザーの設定を代わりに返さない。
   */
  async findByUserId(userId: string) {
    const settings = this.settingsByUserId.get(userId);
    return settings
      ? { categories: settings.categories, levels: settings.levels }
      : null;
  }

  /**
   * 所有者と分類IDが一致する場合だけ分類名を更新する。
   * @param userId 認証済みユーザーIDを指定する。
   * @param categoryId 更新対象の分類IDを指定する。
   * @param name 新しい分類名を指定する。
   * @returns 更新できた場合はtrue、対象がない場合はfalseを返す。
   * @remarks 別ユーザーが所有する分類は更新しない。
   */
  async updateCategoryName(
    userId: string,
    categoryId: string,
    name: string,
  ): Promise<boolean> {
    const settings = this.settingsByUserId.get(userId);
    const category = settings?.categories.find(({ id }) => id === categoryId);
    if (!category) {
      return false;
    }
    category.name = name;
    return true;
  }
}

describe('UserSettingsService', () => {
  test('新規ユーザーに既定分類とレベル1～5を作成する', async () => {
    const service = new UserSettingsService(
      new InMemoryUserSettingsRepository(),
    );

    const result = await service.create({
      name: '利用者',
      email: 'USER@example.com',
      passwordHash: 'hashed-password',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.categories.map(({ name }) => name)).toEqual([
        '未分類',
      ]);
      expect(result.settings.levels.map(({ level }) => level)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(
        result.settings.levels.every(
          ({ userId }) => userId === result.settings.user.id,
        ),
      ).toBe(true);
    }
  });

  test('別ユーザーの設定を参照できない', async () => {
    const repository = new InMemoryUserSettingsRepository();
    const service = new UserSettingsService(repository);
    const created = await service.create({
      name: '利用者',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
    });
    expect(created.ok).toBe(true);

    const result = await service.findOwned('another-user-id');

    expect(result).toEqual({ ok: false, message: '設定はまだありません。' });
  });

  test('別ユーザーの分類を更新できない', async () => {
    const repository = new InMemoryUserSettingsRepository();
    const service = new UserSettingsService(repository);
    const created = await service.create({
      name: '利用者',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const result = await service.updateOwnedCategory(
      'another-user-id',
      created.settings.categories[0].id,
      '変更後',
    );

    expect(result).toEqual({
      ok: false,
      message: '更新できる分類が見つかりません。',
    });
  });

  test('必須入力がない場合に利用者向けメッセージを返す', async () => {
    const service = new UserSettingsService(
      new InMemoryUserSettingsRepository(),
    );

    const result = await service.create({
      name: ' ',
      email: '',
      passwordHash: '',
    });

    expect(result).toEqual({
      ok: false,
      message: '名前、メールアドレス、パスワードを入力してください。',
    });
  });
});
