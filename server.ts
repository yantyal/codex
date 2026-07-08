import express, { type Request, type Response } from 'express';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello Express');
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;
