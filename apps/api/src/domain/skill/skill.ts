export type Skill = {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  criteria: string;
  notes: string;
  archivedAt: Date | null;
};
export type SkillInput = Omit<Skill, 'id' | 'userId' | 'archivedAt'>;
export interface SkillRepository {
  listOwned(userId: string): Promise<Skill[]>;
  findOwned(userId: string, id: string): Promise<Skill | null>;
  createOwned(userId: string, input: SkillInput): Promise<Skill>;
  updateOwned(
    userId: string,
    id: string,
    input: SkillInput,
  ): Promise<Skill | null>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
  categoryIsOwnedAndActive(
    userId: string,
    categoryId: string,
  ): Promise<boolean>;
}
