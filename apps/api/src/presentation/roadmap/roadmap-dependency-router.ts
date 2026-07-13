import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { RoadmapDependencyService } from '../../application/roadmap/roadmap-dependency-service.js';

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
 * JSON入力から文字列の前提項目ID配列を取り出す。
 * @param body JSONとして受け取った入力値
 * @returns 正しい配列、または形式が違う場合はnull
 */
function prerequisiteIds(body: Record<string, unknown>): string[] | null {
  if (!Array.isArray(body.prerequisiteItemIds)) return null;
  if (!body.prerequisiteItemIds.every((id) => typeof id === 'string'))
    return null;
  return body.prerequisiteItemIds;
}

/**
 * 認証済み利用者向けロードマップ依存関係APIを作成する。
 * @param auth セッションを確認する認証サービス
 * @param service ロードマップ依存関係を処理するサービス
 * @returns Expressへ登録するルーター
 */
export function createRoadmapDependencyRouter(
  auth: AuthService,
  service: RoadmapDependencyService,
): Router {
  const router = Router();
  router.use(async (request, response, next) => {
    const user = await auth.authenticate(sessionToken(request));
    if (!user)
      return response.status(401).json({ message: 'ログインしてください。' });
    response.locals.user = user;
    return next();
  });
  router.get('/:roadmapItemId', async (request, response) => {
    const result = await service.find(
      response.locals.user.id,
      request.params.roadmapItemId,
    );
    return result.ok
      ? response.json({ items: result.items })
      : response.status(404).json({ message: result.message });
  });
  router.put('/:roadmapItemId', async (request, response) => {
    const ids = prerequisiteIds(request.body ?? {});
    if (!ids)
      return response.status(400).json({
        message: '前提項目はIDの配列で指定してください。',
      });
    const result = await service.replace(
      response.locals.user.id,
      request.params.roadmapItemId,
      ids,
    );
    return result.ok
      ? response.json({ items: result.items })
      : response
          .status(
            result.message === 'ロードマップ項目が見つかりません。' ? 404 : 400,
          )
          .json({ message: result.message });
  });
  return router;
}
