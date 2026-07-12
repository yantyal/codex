import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { CareerSkillService } from '../../application/career-skill/career-skill-service.js';
function token(request: Request) {
  const value = request.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('cgm_session='));
  return value ? decodeURIComponent(value.slice(12)) : undefined;
}
/** 認証済み利用者向け目標スキル関連APIを作成する。 */
export function createCareerSkillRouter(
  auth: AuthService,
  service: CareerSkillService,
) {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(token(request));
    if (!user)
      return response.status(401).json({ message: 'ログインしてください。' });
    response.locals.user = user;
    return next();
  });
  router.get('/:goalId', async (request, response) => {
    const value = await service.gaps(
      response.locals.user.id,
      request.params.goalId,
    );
    return value
      ? response.json({ items: value })
      : response
          .status(404)
          .json({ message: 'キャリア目標が見つかりません。' });
  });
  router.put('/:goalId', async (request, response) => {
    const result = await service.replace(
      response.locals.user.id,
      request.params.goalId,
      Array.isArray(request.body.skillIds)
        ? request.body.skillIds.map(String)
        : [],
    );
    return result.ok
      ? response.status(204).send()
      : response.status(400).json({ message: result.message });
  });
  return router;
}
