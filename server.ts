import express, { type Request, type Response } from 'express';
import { createDatabase, type AppDatabase } from './db';

const port = process.env.PORT ?? 3000;

/**
 * Express アプリケーションを作成する。
 */
export function createApp(database: AppDatabase = createDatabase()) {
  const app = express();

  app.get('/', (_req: Request, res: Response) => {
    database.recordVisit('/');
    res.send('Hello Express');
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', database: 'ok' });
  });

  app.get('/visits', (req: Request, res: Response) => {
    const path = typeof req.query.path === 'string' ? req.query.path : '/';
    res.json(database.getVisitCount(path));
  });

  return app;
}

if (require.main === module) {
  const app = createApp();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default createApp;
