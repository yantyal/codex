/** ユーザーが所有するスキル分類を表す。 */
export type SkillCategory = {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

/** ユーザーが所有するスキルレベル定義を表す。 */
export type SkillLevelDefinition = {
  id: string;
  userId: string;
  level: number;
  name: string;
  description: string;
};

/** 新規ユーザーと初期設定をまとめて保存するための値を表す。 */
export type NewUserSettings = {
  user: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
  };
  categories: SkillCategory[];
  levels: SkillLevelDefinition[];
};

/** ユーザー設定の読み書きを所有者単位で行う境界を表す。 */
export interface UserSettingsRepository {
  /**
   * ユーザーと初期設定を一括して保存する。
   * @param settings 保存するユーザー、分類、レベルを指定する。
   * @returns 保存完了を表すPromiseを返す。
   * @remarks インフラ層では全件を同一トランザクションで保存する。
   */
  createWithDefaults(settings: NewUserSettings): Promise<void>;

  /**
   * 指定した所有者の設定だけを取得する。
   * @param userId 認証済みユーザーIDを指定する。
   * @returns 所有者の分類とレベルを返し、存在しない場合はnullを返す。
   * @remarks IDだけで全ユーザーの設定を検索しないようにする。
   */
  findByUserId(userId: string): Promise<{
    categories: SkillCategory[];
    levels: SkillLevelDefinition[];
  } | null>;

  /**
   * 所有者に一致する分類だけを更新する。
   * @param userId 認証済みユーザーIDを指定する。
   * @param categoryId 更新対象の分類IDを指定する。
   * @param name 新しい分類名を指定する。
   * @returns 更新できた場合はtrue、対象がない場合はfalseを返す。
   * @remarks 更新条件にはuserIdとcategoryIdの両方を含める。
   */
  updateCategoryName(
    userId: string,
    categoryId: string,
    name: string,
  ): Promise<boolean>;
}
