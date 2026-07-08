import request from 'supertest';
import app from './server';

describe('GET /health', () => {
  test('returns ok status', async () => {
    // supertest は、実際にサーバーを起動せずに Express アプリをテストする。
    const response = await request(app).get('/health');

    // /health が正常を表す HTTP ステータス 200 を返すことを確認する。
    expect(response.status).toBe(200);

    // レスポンスの JSON が期待どおり { status: 'ok' } であることを確認する。
    expect(response.body).toEqual({ status: 'ok' });
  });
});
