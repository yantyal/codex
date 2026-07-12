import { Router, type Request, type Response } from 'express';
import type { AuthService } from '../../application/auth/auth-service.js';

const COOKIE_NAME = 'cgm_session';

/** Cookieヘッダーから指定したCookieの値だけを取得する。 */
function readCookie(request: Request, name: string): string | undefined {
  const pairs = request.headers.cookie?.split(';') ?? [];
  const pair = pairs
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

/** 認証APIのHTTPルーターを作成する。 */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const setSession = (response: Response, token: string) =>
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

  router.post('/register', async (request, response) => {
    const result = await authService.register(request.body ?? {});
    if (!result.ok)
      return response.status(result.status).json({ message: result.message });
    setSession(response, result.sessionToken);
    return response
      .status(201)
      .json({ user: result.user, csrfToken: result.csrfToken });
  });
  router.post('/login', async (request, response) => {
    const result = await authService.login(request.body ?? {});
    if (!result.ok)
      return response.status(result.status).json({ message: result.message });
    setSession(response, result.sessionToken);
    return response.json({ user: result.user, csrfToken: result.csrfToken });
  });
  router.get('/me', async (request, response) => {
    const user = await authService.authenticate(
      readCookie(request, COOKIE_NAME),
    );
    return user
      ? response.json({ user })
      : response.status(401).json({ message: 'ログインしてください。' });
  });
  router.post('/logout', async (request, response) => {
    const loggedOut = await authService.logout(
      readCookie(request, COOKIE_NAME),
      request.header('x-csrf-token'),
    );
    if (!loggedOut)
      return response
        .status(403)
        .json({ message: 'ログアウト要求を確認できません。' });
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });
    return response.status(204).send();
  });
  return router;
}
