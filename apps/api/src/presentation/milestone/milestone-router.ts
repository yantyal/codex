import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { MilestoneService } from '../../application/milestone/milestone-service.js';

/**
 * Cookie文字列からセッショントークンを取り出す。
 * @param request 利用者から届いたHTTPリクエスト
 * @returns トークン、またはCookieがない場合はundefined
 */
function sessionToken(request: Request): string | undefined {
  const value = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('cgm_session='));
  return value
    ? decodeURIComponent(value.slice('cgm_session='.length))
    : undefined;
}

/**
 * 任意のHTTP入力を日付またはnullへ変換する。
 * @param value HTTPで受け取った値
 * @returns 入力された日付、または未入力を表すnull
 */
function nullableDate(value: unknown): Date | null {
  if (value === '' || value === null || value === undefined) return null;
  return new Date(String(value));
}

/**
 * HTTPのJSON入力をサービス層で扱うマイルストーン入力へ変換する。
 * @param body JSONとして受け取った入力値
 * @returns マイルストーンサービスへ渡す入力値
 */
function input(body: Record<string, unknown>) {
  return {
    goalId: String(body.goalId ?? ''),
    name: String(body.name ?? ''),
    dueDate: new Date(String(body.dueDate ?? '')),
    completionCondition: String(body.completionCondition ?? ''),
    weight: Number(body.weight),
    status: String(body.status ?? 'not_started') as
      'not_started' | 'in_progress' | 'completed' | 'on_hold',
    completedDate: nullableDate(body.completedDate),
  };
}

/**
 * 認証済み利用者向けのマイルストーンAPIを作成する。
 * @param auth セッションを確認する認証サービス
 * @param service マイルストーンを処理するサービス
 * @returns Expressへ登録するルーター
 */
export function createMilestoneRouter(
  auth: AuthService,
  service: MilestoneService,
): Router {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(sessionToken(request));
    if (!user)
      return response.status(401).json({ message: 'ログインしてください。' });
    response.locals.user = user;
    return next();
  });
  router.get('/', async (request, response) => {
    const result = await service.list(
      response.locals.user.id,
      String(request.query.goalId ?? ''),
    );
    return result.ok
      ? response.json({ items: result.items })
      : response.status(404).json({ message: result.message });
  });
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
    const result = await service.find(
      response.locals.user.id,
      String(request.query.goalId ?? ''),
      request.params.id,
    );
    return result.ok
      ? response.json(result.value)
      : response.status(404).json({ message: result.message });
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
          .status(
            result.message === 'マイルストーンが見つかりません。' ? 404 : 400,
          )
          .json({ message: result.message });
  });
  router.delete('/:id', async (request, response) =>
    (await service.archive(
      response.locals.user.id,
      String(request.query.goalId ?? ''),
      request.params.id,
    ))
      ? response.status(204).send()
      : response
          .status(404)
          .json({ message: 'マイルストーンが見つかりません。' }),
  );
  return router;
}
