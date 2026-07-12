import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { CareerGoalService } from '../../application/career/career-goal-service.js';

function sessionToken(request: Request): string | undefined {
  const value = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('cgm_session='));
  return value
    ? decodeURIComponent(value.slice('cgm_session='.length))
    : undefined;
}
function input(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ''),
    targetRole: String(body.targetRole ?? ''),
    dueDate: new Date(String(body.dueDate ?? '')),
    reason: String(body.reason ?? ''),
    currentState: String(body.currentState ?? ''),
    targetState: String(body.targetState ?? ''),
    priority: String(body.priority ?? 'medium') as 'high' | 'medium' | 'low',
    status: String(body.status ?? 'not_started') as
      'not_started' | 'in_progress' | 'achieved' | 'on_hold',
  };
}

/** 認証済み利用者向けキャリア目標APIを作成する。 */
export function createCareerGoalRouter(
  auth: AuthService,
  service: CareerGoalService,
): Router {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(sessionToken(request));
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
      : response
          .status(404)
          .json({ message: 'キャリア目標が見つかりません。' });
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
      : response
          .status(404)
          .json({ message: 'キャリア目標が見つかりません。' }),
  );
  return router;
}
