import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { RoadmapItemService } from '../../application/roadmap/roadmap-item-service.js';

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
 * HTTPの入力値をアプリケーション層で扱う型へ変換する。
 * @param body JSONとして受け取った入力値
 * @returns ロードマップ項目サービスへ渡す入力値
 */
function input(body: Record<string, unknown>) {
  const skillId = String(body.skillId ?? '').trim();
  return {
    careerGoalId: String(body.careerGoalId ?? ''),
    skillId: skillId || null,
    name: String(body.name ?? ''),
    plannedStartDate: new Date(String(body.plannedStartDate ?? '')),
    plannedEndDate: new Date(String(body.plannedEndDate ?? '')),
    sortOrder: Number(body.sortOrder),
    priority: String(body.priority ?? 'medium') as 'high' | 'medium' | 'low',
    status: String(body.status ?? 'planned') as
      'planned' | 'in_progress' | 'completed' | 'on_hold',
    progressRate: Number(body.progressRate),
  };
}

/**
 * 認証済み利用者向けロードマップ項目APIを作成する。
 * @param auth セッションを確認する認証サービス
 * @param service ロードマップ項目を処理するサービス
 * @returns Expressへ登録するルーター
 */
export function createRoadmapItemRouter(
  auth: AuthService,
  service: RoadmapItemService,
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
          .json({ message: 'ロードマップ項目が見つかりません。' });
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
          .json({ message: 'ロードマップ項目が見つかりません。' }),
  );
  return router;
}
