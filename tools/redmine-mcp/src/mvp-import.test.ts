import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildTicketDescription,
  parseMvpTickets,
  trackerNameForTicket,
} from './mvp-import.js';

test('parseMvpTickets reads dependencies and acceptance criteria', () => {
  const markdown = `
| MVP-001 | EPIC-01 | 基盤を整備する | - | 基盤を再現できる。 |
| MVP-002 | EPIC-01 | 認証を実装する | MVP-001, MVP-003 | ログインできる。 |
`;

  const tickets = parseMvpTickets(markdown);

  assert.equal(tickets.length, 2);
  assert.deepEqual(tickets[0]?.dependencies, []);
  assert.deepEqual(tickets[1]?.dependencies, ['MVP-001', 'MVP-003']);
  assert.equal(tickets[1]?.acceptanceCriterion, 'ログインできる。');
});

test('buildTicketDescription includes fixed sections for Codex', () => {
  const description = buildTicketDescription({
    id: 'MVP-001',
    epicId: 'EPIC-01',
    title: '基盤を整備する',
    dependencies: [],
    acceptanceCriterion: '基盤を再現できる。',
  });

  assert.match(description, /h2\. 対応範囲/);
  assert.match(description, /h2\. 対象外/);
  assert.match(description, /h2\. 受入条件/);
  assert.match(description, /基盤を再現できる。/);
  assert.match(description, /h2\. 検証/);
  assert.match(description, /h2\. Codex 作業結果に記録する内容/);
});

test('trackerNameForTicket classifies implementation work', () => {
  assert.equal(trackerNameForTicket('MVP-001'), '技術タスク');
  assert.equal(trackerNameForTicket('MVP-010'), '機能');
  assert.equal(trackerNameForTicket('MVP-061'), 'テスト・品質');
  assert.equal(trackerNameForTicket('MVP-063'), 'ドキュメント');
});
