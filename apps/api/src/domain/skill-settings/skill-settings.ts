export type CategorySetting = {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};
export type LevelSetting = {
  id: string;
  userId: string;
  level: number;
  name: string;
  description: string;
};
export interface SkillSettingsRepository {
  getOwned(
    userId: string,
  ): Promise<{ categories: CategorySetting[]; levels: LevelSetting[] }>;
  createCategory(
    userId: string,
    name: string,
    displayOrder: number,
  ): Promise<CategorySetting>;
  updateCategory(
    userId: string,
    id: string,
    input: { name: string; displayOrder: number; isActive: boolean },
  ): Promise<CategorySetting | null>;
  updateLevel(
    userId: string,
    level: number,
    input: { name: string; description: string },
  ): Promise<LevelSetting | null>;
}
