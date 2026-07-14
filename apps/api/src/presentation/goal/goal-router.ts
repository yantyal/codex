import { Router, type Request } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';
import type { GoalService } from '../../application/goal/goal-service.js';

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
 * @param value HTTPで受け取った任意の値
 * @returns 文字列、または未選択を表すnull
 */
function nullableId(value: unknown): string | null {
  const id = String(value ?? '').trim();
  return id || null;
}

/**
 * 空文字を未入力のnullへ変換し、それ以外を数値へ変換する。
 * @param value HTTPで受け取った任意の値
 * @returns 数値、または未入力を表すnull
 */
function nullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value);
}

/**
 * HTTPの入力値をアプリケーション層で扱う型へ変換する。
 * @param body JSONとして受け取った入力値
 * @returns 目標サービスへ渡す入力値
 */
function input(body: Record<string, unknown>) {
  return {
    roadmapItemId: nullableId(body.roadmapItemId),
    evaluationPeriodId: nullableId(body.evaluationPeriodId),
    name: String(body.name ?? ''),
    description: String(body.description ?? ''),
    category: String(body.category ?? ''),
    calculationType: String(body.calculationType ?? 'numeric') as
      'numeric' | 'milestone' | 'habit' | 'manual',
    startDate: new Date(String(body.startDate ?? '')),
    dueDate: new Date(String(body.dueDate ?? '')),
    completionCondition: String(body.completionCondition ?? ''),
    measurementMethod: String(body.measurementMethod ?? ''),
    targetValue: nullableNumber(body.targetValue),
    currentValue: nullableNumber(body.currentValue),
    unit: String(body.unit ?? ''),
    plannedDays: nullableNumber(body.plannedDays),
    manualProgress: nullableNumber(body.manualProgress),
    manualReason: String(body.manualReason ?? ''),
    priority: String(body.priority ?? 'medium') as 'high' | 'medium' | 'low',
    weight: Number(body.weight),
    status: String(body.status ?? 'not_started') as
      'not_started' | 'in_progress' | 'achieved' | 'on_hold',
  };
}

/**
 * 認証済み利用者向け実行目標APIを作成する。
 * @param auth セッションを確認する認証サービス
 * @param service 実行目標を処理するサービス
 * @returns Expressへ登録するルーター
 */
export function createGoalRouter(
  auth: AuthService,
  service: GoalService,
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
  router.post('/smart-warnings', (request, response) =>
    response.json({
      warnings: service.evaluateSmart(input(request.body ?? {})),
    }),
  );
  router.post('/', async (request, response) => {
    const result = await service.create(
      response.locals.user.id,
      input(request.body ?? {}),
    );
    return result.ok
      ? response
          .status(201)
          .json({ ...result.value, smartWarnings: result.warnings })
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
      ? response.json({ ...result.value, smartWarnings: result.warnings })
      : response
          .status(result.message === '目標が見つかりません。' ? 404 : 400)
          .json({ message: result.message });
  });
  router.delete('/:id', async (request, response) =>
    (await service.archive(response.locals.user.id, request.params.id))
      ? response.status(204).send()
      : response.status(404).json({ message: '目標が見つかりません。' }),
  );
  return router;
}
