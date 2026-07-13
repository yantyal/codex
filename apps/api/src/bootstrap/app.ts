import express, { type Express } from 'express';
import type { AuthService } from '../application/auth/auth-service.js';
import { createAuthRouter } from '../presentation/auth/auth-router.js';
import type { CareerGoalService } from '../application/career/career-goal-service.js';
import { createCareerGoalRouter } from '../presentation/career/career-goal-router.js';
import type { SkillSettingsService } from '../application/skill-settings/skill-settings-service.js';
import { createSkillSettingsRouter } from '../presentation/skill-settings/skill-settings-router.js';
import type { SkillService } from '../application/skill/skill-service.js';
import { createSkillRouter } from '../presentation/skill/skill-router.js';
import type { CareerSkillService } from '../application/career-skill/career-skill-service.js';
import { createCareerSkillRouter } from '../presentation/career-skill/career-skill-router.js';
import type { RoadmapItemService } from '../application/roadmap/roadmap-item-service.js';
import { createRoadmapItemRouter } from '../presentation/roadmap/roadmap-item-router.js';

/**
 * API 基盤が起動可能であることを表す最小のアプリケーション情報を返す。
 * @returns API 名と状態を返す。
 * @remarks 業務機能は後続チケットで追加する。
 */
export function getApplicationInfo(): { name: string; status: 'ok' } {
  return { name: 'Career Growth Manager API', status: 'ok' };
}

/** Career Growth ManagerのHTTP APIを作成する。 */
export function createApiApp(
  authService: AuthService,
  careerGoalService?: CareerGoalService,
  skillSettingsService?: SkillSettingsService,
  skillService?: SkillService,
  careerSkillService?: CareerSkillService,
  roadmapItemService?: RoadmapItemService,
): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(authService));
  if (careerGoalService)
    app.use(
      '/api/career-goals',
      createCareerGoalRouter(authService, careerGoalService),
    );
  if (skillSettingsService)
    app.use(
      '/api/skill-settings',
      createSkillSettingsRouter(authService, skillSettingsService),
    );
  if (skillService)
    app.use('/api/skills', createSkillRouter(authService, skillService));
  if (careerSkillService)
    app.use(
      '/api/career-goal-skills',
      createCareerSkillRouter(authService, careerSkillService),
    );
  if (roadmapItemService)
    app.use(
      '/api/roadmap-items',
      createRoadmapItemRouter(authService, roadmapItemService),
    );
  return app;
}
