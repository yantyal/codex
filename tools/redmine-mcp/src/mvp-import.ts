import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { RedmineClient, type RedmineIssue } from './redmine-client.js';

export type MvpTicket = {
  id: string;
  epicId: string;
  title: string;
  dependencies: string[];
  acceptanceCriterion: string;
};

export type MvpEpic = {
  id: string;
  name: string;
  completionDefinition: string;
};

const epics: MvpEpic[] = [
  {
    id: 'EPIC-01',
    name: '基盤・認証',
    completionDefinition:
      '安全にログインし、ユーザー単位でデータを分離できる。',
  },
  {
    id: 'EPIC-02',
    name: 'キャリア・スキル',
    completionDefinition:
      'キャリア目標と必要スキルを登録し、差分を確認できる。',
  },
  {
    id: 'EPIC-03',
    name: 'ロードマップ・目標',
    completionDefinition: 'ロードマップから測定可能な目標を作成できる。',
  },
  {
    id: 'EPIC-04',
    name: '日次実績・証跡',
    completionDefinition: '日々の行動・成果・証跡を目標へ記録できる。',
  },
  {
    id: 'EPIC-05',
    name: '進捗・ダッシュボード',
    completionDefinition: '達成率、遅延、活動状況を確認できる。',
  },
  {
    id: 'EPIC-06',
    name: '評価資料',
    completionDefinition: '評価期間で集約し、Web と PDF で出力できる。',
  },
  {
    id: 'EPIC-07',
    name: '品質・リリース',
    completionDefinition: '非機能要件、E2E、運用文書が整う。',
  },
];

const epicSpecificationLinks: Record<string, string[]> = {
  'EPIC-01': [
    'docs/technical-design/architecture.md',
    'docs/technical-design/adr/004-session-authentication.md',
  ],
  'EPIC-02': [
    'docs/specification/screen-items.md',
    'docs/technical-design/domain-design.md',
  ],
  'EPIC-03': [
    'docs/specification/screen-items.md',
    'docs/specification/er-diagram.md',
    'docs/technical-design/domain-design.md',
  ],
  'EPIC-04': [
    'docs/specification/screen-items.md',
    'docs/specification/er-diagram.md',
  ],
  'EPIC-05': [
    'docs/specification/mvp-scope.md',
    'docs/specification/screen-items.md',
  ],
  'EPIC-06': [
    'docs/specification/screen-items.md',
    'docs/specification/er-diagram.md',
  ],
  'EPIC-07': [
    'docs/specification/mvp-scope.md',
    'docs/technical-design/testing-strategy.md',
    'docs/technical-design/deployment.md',
  ],
};

const technicalTaskIds = new Set(['MVP-001', 'MVP-002', 'MVP-004']);
const qualityTaskIds = new Set(['MVP-061', 'MVP-062']);
const documentationTaskIds = new Set(['MVP-063']);

/**
 * MVP チケットの内容から Redmine トラッカー名を決定する。
 * @param ticketId MVP チケットの管理 ID を指定する。
 * @returns 適用するトラッカー名を返す。
 * @remarks 明示的な分類にないチケットは利用者向けの「機能」とする。
 */
export function trackerNameForTicket(ticketId: string): string {
  if (technicalTaskIds.has(ticketId)) {
    return '技術タスク';
  }
  if (qualityTaskIds.has(ticketId)) {
    return 'テスト・品質';
  }
  if (documentationTaskIds.has(ticketId)) {
    return 'ドキュメント';
  }
  return '機能';
}

/**
 * MVP 開発チケットの Markdown 表を構造化データへ変換する。
 * @param markdown `mvp-tickets.md` の本文を指定する。
 * @returns MVP チケット一覧を返す。
 * @remarks `MVP-xxx` で始まる行だけを対象にする。
 */
export function parseMvpTickets(markdown: string): MvpTicket[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*MVP-\d{3}\s*\|/.test(line))
    .map((line) => {
      const columns = line
        .split('|')
        .slice(1, -1)
        .map((column) => column.trim());
      const [id, epicId, title, dependencyText, acceptanceCriterion] = columns;

      if (!id || !epicId || !title || !dependencyText || !acceptanceCriterion) {
        throw new Error(`Invalid MVP ticket row: ${line}`);
      }

      return {
        id,
        epicId,
        title,
        dependencies:
          dependencyText === '-'
            ? []
            : dependencyText.split(',').map((value) => value.trim()),
        acceptanceCriterion,
      };
    });
}

/**
 * Codex が安全に実装できる定型構造で Epic の説明を作成する。
 * @param epic Epic の定義を指定する。
 * @returns Redmine Textile 形式の説明を返す。
 * @remarks Epic は実装作業ではなく、子課題の進捗管理に利用する。
 */
export function buildEpicDescription(epic: MvpEpic): string {
  return [
    'h2. 目的',
    '',
    epic.completionDefinition,
    '',
    'h2. 完了条件',
    '',
    '* 配下の必須 MVP チケットがすべて「レビュー待ち」以降になっている。',
    '* Epic 単位の受入シナリオが確認できる。',
    '* 未解決のブロッカーと対象外事項が記録されている。',
    '',
    'h2. Codex 作業ルール',
    '',
    '* この Epic 自体から実装を開始せず、必ず子課題を選択する。',
    '* 子課題の受入条件を越えて変更しない。',
    '* 完了ではなく「レビュー待ち」までを Codex の担当とする。',
    '',
    'h2. 参照',
    '',
    '* docs/specification/mvp-tickets.md',
    '* AGENTS.md',
  ].join('\n');
}

/**
 * Codex が実装範囲を判断できる定型構造でチケット説明を作成する。
 * @param ticket MVP チケットの定義を指定する。
 * @returns Redmine Textile 形式の説明を返す。
 * @remarks 元仕様の受入条件を変更せずに含める。
 */
export function buildTicketDescription(ticket: MvpTicket): string {
  const dependencies =
    ticket.dependencies.length === 0
      ? '* なし'
      : ticket.dependencies.map((id) => `* ${id}`).join('\n');
  const references = [
    'docs/specification/mvp-tickets.md',
    ...(epicSpecificationLinks[ticket.epicId] ?? []),
    'AGENTS.md',
  ]
    .map((path) => `* ${path}`)
    .join('\n');

  return [
    'h2. 目的',
    '',
    ticket.title,
    '',
    'h2. 対応範囲',
    '',
    `* ${ticket.title}`,
    '* 受入条件を満たすために必要な最小限の実装、テスト、文書更新',
    '',
    'h2. 対象外',
    '',
    '* この課題の受入条件に記載されていない機能追加',
    '* データ削除、依存関係のメジャーアップデート、承認されていない DB マイグレーション',
    '* main ブランチへの直接コミット',
    '',
    'h2. 受入条件',
    '',
    `* ${ticket.acceptanceCriterion}`,
    '* ユーザー所有データを扱う場合、別ユーザーから参照・更新できない。',
    '* 入力エラーと空状態を利用者が理解できる形で表示する。',
    '',
    'h2. 検証',
    '',
    '* 受入条件を自動テストまたは再現可能な確認手順で検証する。',
    '* npm run lint を実行する。',
    '* npm test を実行する。',
    '* npm run build を実行する。',
    '* 失敗した検証がある場合は「レビュー待ち」へ変更しない。',
    '',
    'h2. 依存関係',
    '',
    dependencies,
    '',
    'h2. Codex 作業結果に記録する内容',
    '',
    '* ブランチ名',
    '* コミット ID',
    '* 変更ファイル',
    '* lint、test、build の結果',
    '* 残課題とレビュー観点',
    '',
    'h2. 参照',
    '',
    references,
  ].join('\n');
}

/**
 * 件名の先頭にある管理 ID から既存課題を検索できる Map を作る。
 * @param issues Redmine の既存課題を指定する。
 * @returns 管理 ID をキーにした課題 Map を返す。
 * @remarks 件名が `[MVP-001]` または `[EPIC-01]` で始まる課題だけを登録する。
 */
function indexIssuesByManagementId(
  issues: RedmineIssue[],
): Map<string, RedmineIssue> {
  const result = new Map<string, RedmineIssue>();
  for (const issue of issues) {
    const match = /^\[(MVP-\d{3}|EPIC-\d{2})\]/.exec(issue.subject);
    if (match?.[1]) {
      result.set(match[1], issue);
    }
  }
  return result;
}

/**
 * MVP Epic と開発チケットを Redmine へ冪等に登録する。
 * @returns 登録・更新・関連作成件数を返す。
 * @remarks 削除、ステータス変更、進捗率変更は行わない。
 */
async function main(): Promise<void> {
  const apiKey = process.env.REDMINE_API_KEY;
  if (!apiKey) {
    throw new Error('REDMINE_API_KEY is required.');
  }

  const sourcePath = fileURLToPath(
    new URL('../../../docs/specification/mvp-tickets.md', import.meta.url),
  );
  const tickets = parseMvpTickets(await readFile(sourcePath, 'utf8'));
  if (tickets.length !== 30) {
    throw new Error(`Expected 30 MVP tickets but found ${tickets.length}.`);
  }

  const client = new RedmineClient(
    process.env.REDMINE_URL ?? 'http://localhost:8080',
    apiKey,
  );
  const projects = await client.listProjects();
  const project = projects.projects.find(
    (candidate) => candidate.identifier === 'career-growth-manager',
  );
  if (!project) {
    throw new Error('Career Growth Manager project was not found.');
  }

  const trackers = await client.listTrackers();
  const trackerByName = new Map(
    trackers.map((tracker) => [tracker.name, tracker]),
  );
  const requiredTrackerNames = [
    'Epic',
    '機能',
    '技術タスク',
    'テスト・品質',
    'ドキュメント',
  ];
  const missingTrackerNames = requiredTrackerNames.filter(
    (name) => !trackerByName.has(name),
  );
  if (missingTrackerNames.length > 0) {
    throw new Error(
      `Required Redmine trackers were not found: ${missingTrackerNames.join(', ')}`,
    );
  }

  const listed = await client.listIssues(project.identifier, '*', 100);
  const issueByManagementId = indexIssuesByManagementId(listed.issues);
  let created = 0;
  let updated = 0;
  let relationsCreated = 0;

  for (const epic of epics) {
    const tracker = trackerByName.get('Epic');
    if (!tracker) {
      throw new Error('Epic tracker was not found.');
    }
    const input = {
      projectId: project.id,
      trackerId: tracker.id,
      subject: `[${epic.id}] ${epic.name}`,
      description: buildEpicDescription(epic),
    };
    const existing = issueByManagementId.get(epic.id);
    if (existing) {
      await client.updateIssue(existing.id, input);
      updated += 1;
    } else {
      const issue = await client.createIssue(input);
      issueByManagementId.set(epic.id, issue);
      created += 1;
    }
  }

  for (const ticket of tickets) {
    const parent = issueByManagementId.get(ticket.epicId);
    if (!parent) {
      throw new Error(`Parent Epic ${ticket.epicId} was not found.`);
    }
    const trackerName = trackerNameForTicket(ticket.id);
    const tracker = trackerByName.get(trackerName);
    if (!tracker) {
      throw new Error(`${trackerName} tracker was not found.`);
    }
    const input = {
      projectId: project.id,
      trackerId: tracker.id,
      subject: `[${ticket.id}] ${ticket.title}`,
      description: buildTicketDescription(ticket),
      parentIssueId: parent.id,
    };
    const existing = issueByManagementId.get(ticket.id);
    if (existing) {
      await client.updateIssue(existing.id, input);
      updated += 1;
    } else {
      const issue = await client.createIssue(input);
      issueByManagementId.set(ticket.id, issue);
      created += 1;
    }
  }

  for (const ticket of tickets) {
    const following = issueByManagementId.get(ticket.id);
    if (!following) {
      throw new Error(`Imported ticket ${ticket.id} was not found.`);
    }
    for (const dependencyId of ticket.dependencies) {
      const preceding = issueByManagementId.get(dependencyId);
      if (!preceding) {
        throw new Error(`Dependency ${dependencyId} was not found.`);
      }
      const details = await client.getIssue(preceding.id);
      const exists = details.relations?.some(
        (relation) =>
          relation.relation_type === 'precedes' &&
          relation.issue_id === preceding.id &&
          relation.issue_to_id === following.id,
      );
      if (!exists) {
        await client.createPrecedesRelation(preceding.id, following.id);
        relationsCreated += 1;
      }
    }
  }

  process.stdout.write(
    `${JSON.stringify({ epics: epics.length, tickets: tickets.length, created, updated, relationsCreated })}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
