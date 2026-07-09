import request from 'supertest';
import { createDatabase } from './db';
import { createApp } from './server';

describe('GET /health', () => {
  test('returns ok status', async () => {
    const database = createDatabase(':memory:');
    const app = createApp(database);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });

    database.close();
  });
});

describe('GET /visits', () => {
  test('returns the stored visit count for a path', async () => {
    const database = createDatabase(':memory:');
    const app = createApp(database);

    await request(app).get('/');
    await request(app).get('/');
    const response = await request(app).get('/visits').query({ path: '/' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ path: '/', count: 2 });

    database.close();
  });
});
