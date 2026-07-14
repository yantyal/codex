import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { DailyRecordService } from '../../application/daily-record/daily-record-service.js';

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
 * 空文字を未選択のnullへ変換する。
 * @param value HTTPで受け取った値
 * @returns 文字列、または未選択を表すnull
 */
function nullableId(value: unknown): string | null {
  const id = String(value ?? '').trim();
  return id || null;
}

/**
 * 未入力をnull、それ以外を数値へ変換する。
 * @param value HTTPで受け取った値
 * @returns 数値、または未入力を表すnull
 */
function nullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value);
}

/**
 * HTTPのJSON入力を日次実績サービス用の入力へ変換する。
 * @param body JSONとして受け取った入力値
 * @returns 日次実績サービスへ渡す入力値
 */
function input(body: Record<string, unknown>) {
  return {
    goalId: String(body.goalId ?? ''),
    milestoneId: nullableId(body.milestoneId),
    activityDate: new Date(String(body.activityDate ?? '')),
    description: String(body.description ?? ''),
    workMinutes: Number(body.workMinutes),
    progressAmount: nullableNumber(body.progressAmount),
    learned: String(body.learned ?? ''),
    issue: String(body.issue ?? ''),
    nextAction: String(body.nextAction ?? ''),
  };
}

/**
 * 認証済み利用者向けの日次実績APIを作成する。
 * @param auth セッションを確認する認証サービス
 * @param service 日次実績を処理するサービス
 * @returns Expressへ登録するルーター
 */
export function createDailyRecordRouter(
  auth: AuthService,
  service: DailyRecordService,
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
    const result = await service.find(
      response.locals.user.id,
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
          .status(result.message === '日次実績が見つかりません。' ? 404 : 400)
          .json({ message: result.message });
  });
  router.delete('/:id', async (request, response) =>
    (await service.archive(response.locals.user.id, request.params.id))
      ? response.status(204).send()
      : response.status(404).json({ message: '日次実績が見つかりません。' }),
  );
  return router;
}
