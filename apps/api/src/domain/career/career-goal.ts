/** 利用者が所有する中長期キャリア目標を表す。 */
export type CareerGoal = {
  id: string;
  userId: string;
  name: string;
  targetRole: string;
  dueDate: Date;
  reason: string;
  currentState: string;
  targetState: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'achieved' | 'on_hold';
  archivedAt: Date | null;
};
export type CareerGoalInput = Omit<CareerGoal, 'id' | 'userId' | 'archivedAt'>;

/** キャリア目標を必ず所有者条件付きで保存する境界を表す。 */
export interface CareerGoalRepository {
  listOwned(userId: string): Promise<CareerGoal[]>;
  findOwned(userId: string, id: string): Promise<CareerGoal | null>;
  createOwned(userId: string, input: CareerGoalInput): Promise<CareerGoal>;
  updateOwned(
    userId: string,
    id: string,
    input: CareerGoalInput,
  ): Promise<CareerGoal | null>;
  archiveOwned(userId: string, id: string): Promise<boolean>;
}
