import request from 'supertest';
import { createDatabase } from './db';
import { createApp } from './server';

describe('GET /health', () => {
  test('returns ok status', async () => {
    // 実際のDBファイルを作らず、テストごとに独立したメモリDBを用意する。
    const database = createDatabase(':memory:');
    const app = createApp(database);

    // 利用者と同じようにHTTPリクエストを送り、応答全体を確認する。
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });

    database.close();
  });
});

describe('GET /visits', () => {
  test('returns the stored visit count for a path', async () => {
    // 他のテスト結果が混ざらないよう、このテスト専用のDBを用意する。
    const database = createDatabase(':memory:');
    const app = createApp(database);

    // ルートへ2回アクセスし、保存された回数が2になることを確認する。
    await request(app).get('/');
    await request(app).get('/');
    const response = await request(app).get('/visits').query({ path: '/' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ path: '/', count: 2 });

    database.close();
  });
});
