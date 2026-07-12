import express, { type Express } from 'express';
import type { AuthService } from '../application/auth/auth-service.js';
import { createAuthRouter } from '../presentation/auth/auth-router.js';

/**
 * API 基盤が起動可能であることを表す最小のアプリケーション情報を返す。
 * @returns API 名と状態を返す。
 * @remarks 業務機能は後続チケットで追加する。
 */
export function getApplicationInfo(): { name: string; status: 'ok' } {
  return { name: 'Career Growth Manager API', status: 'ok' };
}

/** Career Growth ManagerのHTTP APIを作成する。 */
export function createApiApp(authService: AuthService): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(authService));
  return app;
}
