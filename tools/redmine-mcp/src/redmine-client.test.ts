import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { RedmineClient } from './redmine-client.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('listIssues sends the API key in a header and limits the page size', async () => {
  let requestedUrl = '';
  let requestedApiKey = '';

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedApiKey = new Headers(init?.headers).get('X-Redmine-API-Key') ?? '';
    return new Response(
      JSON.stringify({ issues: [], total_count: 0, offset: 0, limit: 100 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const client = new RedmineClient('http://localhost:8080', 'secret-api-key');
  await client.listIssues('career-growth-manager', '*', 500);

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, '/issues.json');
  assert.equal(url.searchParams.get('project_id'), 'career-growth-manager');
  assert.equal(url.searchParams.get('status_id'), '*');
  assert.equal(url.searchParams.get('limit'), '100');
  assert.equal(requestedApiKey, 'secret-api-key');
});

test('getIssue does not expose the API key in an error', async () => {
  globalThis.fetch = async () => new Response('', { status: 401 });
  const client = new RedmineClient('http://localhost:8080', 'secret-api-key');

  await assert.rejects(client.getIssue(42), (error: Error) => {
    assert.equal(error.message, 'Redmine request failed with status 401.');
    assert.doesNotMatch(error.message, /secret-api-key/);
    return true;
  });
});
