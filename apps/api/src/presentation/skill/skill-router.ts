import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { SkillService } from '../../application/skill/skill-service.js';
function token(request: Request) {
  const value = request.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('cgm_session='));
  return value ? decodeURIComponent(value.slice(12)) : undefined;
}
function input(body: Record<string, unknown>) {
  return {
    categoryId: String(body.categoryId ?? ''),
    name: String(body.name ?? ''),
    currentLevel: Number(body.currentLevel),
    targetLevel: Number(body.targetLevel),
    criteria: String(body.criteria ?? ''),
    notes: String(body.notes ?? ''),
  };
}
/** 認証済み利用者向けスキルCRUD APIを作成する。 */
export function createSkillRouter(auth: AuthService, service: SkillService) {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(token(request));
    if (!user)
      return response.status(401).json({ message: 'ログインしてください。' });
    response.locals.user = user;
    return next();
  });
  router.get('/', async (_request, response) =>
    response.json({ items: await service.list(response.locals.user.id) }),
  );
  router.post('/', async (request, response) => {
    const result = await service.create(
      response.locals.user.id,
      input(request.body ?? {}),
    );
    return result.ok
      ? response.status(201).json(result.value)
      : response.status(400).json({ message: result.message });
  });
  router.get('/:id', async (request, response) => {
    const value = await service.find(
      response.locals.user.id,
      request.params.id,
    );
    return value
      ? response.json(value)
      : response.status(404).json({ message: 'スキルが見つかりません。' });
  });
  router.put('/:id', async (request, response) => {
    const result = await service.update(
      response.locals.user.id,
      request.params.id,
      input(request.body ?? {}),
    );
    return result.ok
      ? response.json(result.value)
      : response
          .status(result.message.includes('見つかりません') ? 404 : 400)
          .json({ message: result.message });
  });
  router.delete('/:id', async (request, response) =>
    (await service.archive(response.locals.user.id, request.params.id))
      ? response.status(204).send()
      : response.status(404).json({ message: 'スキルが見つかりません。' }),
  );
  return router;
}
