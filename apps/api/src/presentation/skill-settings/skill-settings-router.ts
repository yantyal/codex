import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { SkillSettingsService } from '../../application/skill-settings/skill-settings-service.js';
function token(request: Request) {
  const value = request.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('cgm_session='));
  return value ? decodeURIComponent(value.slice(12)) : undefined;
}
/** 認証済み利用者向けスキル設定APIを作成する。 */
export function createSkillSettingsRouter(
  auth: AuthService,
  service: SkillSettingsService,
) {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(token(request));
    if (!user)
      return response.status(401).json({ message: 'ログインしてください。' });
    response.locals.user = user;
    return next();
  });
  router.get('/', async (_request, response) =>
    response.json(await service.get(response.locals.user.id)),
  );
  router.post('/categories', async (request, response) => {
    const result = await service.createCategory(
      response.locals.user.id,
      String(request.body.name ?? ''),
      Number(request.body.displayOrder ?? 0),
    );
    return result.ok
      ? response.status(201).json(result.value)
      : response.status(400).json({ message: result.message });
  });
  router.put('/categories/:id', async (request, response) => {
    const result = await service.updateCategory(
      response.locals.user.id,
      request.params.id,
      {
        name: String(request.body.name ?? ''),
        displayOrder: Number(request.body.displayOrder ?? 0),
        isActive: Boolean(request.body.isActive),
      },
    );
    return result.ok
      ? response.json(result.value)
      : response
          .status(result.message.includes('見つかりません') ? 404 : 400)
          .json({ message: result.message });
  });
  router.put('/levels/:level', async (request, response) => {
    const result = await service.updateLevel(
      response.locals.user.id,
      Number(request.params.level),
      {
        name: String(request.body.name ?? ''),
        description: String(request.body.description ?? ''),
      },
    );
    return result.ok
      ? response.json(result.value)
      : response
          .status(result.message.includes('見つかりません') ? 404 : 400)
          .json({ message: result.message });
  });
  return router;
}
