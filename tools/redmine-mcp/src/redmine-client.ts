export type RedmineReference = {
  id: number;
  name: string;
};

export type RedmineIssue = {
  id: number;
  project: RedmineReference;
  tracker: RedmineReference;
  status: RedmineReference;
  priority: RedmineReference;
  author: RedmineReference;
  assigned_to?: RedmineReference;
  parent?: { id: number };
  subject: string;
  description: string;
  start_date?: string;
  due_date?: string;
  done_ratio: number;
  created_on: string;
  updated_on: string;
  relations?: RedmineIssueRelation[];
};

export type RedmineIssueRelation = {
  id: number;
  issue_id: number;
  issue_to_id: number;
  relation_type: string;
  delay?: number;
};

export type RedmineTracker = RedmineReference;

export type CreateIssueInput = {
  projectId: number;
  trackerId: number;
  subject: string;
  description: string;
  parentIssueId?: number;
};

export type RedmineProject = {
  id: number;
  name: string;
  identifier: string;
  description: string;
  status: number;
  created_on: string;
  updated_on: string;
};

type IssueListResponse = {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
};

type IssueResponse = {
  issue: RedmineIssue;
};

type ProjectListResponse = {
  projects: RedmineProject[];
  total_count: number;
  offset: number;
  limit: number;
};

type TrackerListResponse = {
  trackers: RedmineTracker[];
};

/**
 * Redmine REST API から課題とプロジェクトを読み取るクライアント。
 */
export class RedmineClient {
  private readonly baseUrl: URL;

  /**
   * Redmine クライアントを作成する。
   * @param baseUrl Redmine のベース URL を指定する。
   * @param apiKey Redmine の API キーを指定する。
   * @returns Redmine API クライアントを返す。
   * @remarks API キーをログや例外メッセージへ含めない。
   */
  constructor(
    baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.baseUrl = new URL(baseUrl);
  }

  /**
   * 条件に一致する課題を取得する。
   * @param projectId プロジェクト識別子を指定する。
   * @param statusId ステータス ID または `*` を指定する。
   * @param limit 最大取得件数を指定する。
   * @returns 課題一覧とページング情報を返す。
   * @remarks Redmine REST API の上限に合わせて 100 件まで取得する。
   */
  async listIssues(
    projectId = 'career-growth-manager',
    statusId = '*',
    limit = 100,
  ): Promise<IssueListResponse> {
    const url = this.buildUrl('/issues.json', {
      project_id: projectId,
      status_id: statusId,
      limit: String(Math.min(Math.max(limit, 1), 100)),
      sort: 'priority:desc,updated_on:desc',
    });

    return this.request<IssueListResponse>(url);
  }

  /**
   * 課題番号で課題の詳細を取得する。
   * @param issueId 課題番号を指定する。
   * @returns 課題の詳細を返す。
   * @remarks 存在しない課題では Redmine の応答を安全なエラーへ変換する。
   */
  async getIssue(issueId: number): Promise<RedmineIssue> {
    const url = this.buildUrl(`/issues/${issueId}.json`, {
      include: 'relations',
    });
    const response = await this.request<IssueResponse>(url);
    return response.issue;
  }

  /**
   * 参照可能なプロジェクトを取得する。
   * @returns プロジェクト一覧とページング情報を返す。
   * @remarks 最大 100 件を取得する。
   */
  async listProjects(): Promise<ProjectListResponse> {
    const url = this.buildUrl('/projects.json', { limit: '100' });
    return this.request<ProjectListResponse>(url);
  }

  /**
   * Redmine で利用可能なトラッカーを取得する。
   * @returns トラッカー一覧を返す。
   * @remarks インポート処理が Feature トラッカーを選ぶために利用する。
   */
  async listTrackers(): Promise<RedmineTracker[]> {
    const url = this.buildUrl('/trackers.json');
    const response = await this.request<TrackerListResponse>(url);
    return response.trackers;
  }

  /**
   * Redmine に新しい課題を作成する。
   * @param input プロジェクト、トラッカー、件名、説明、親課題を指定する。
   * @returns 作成された課題を返す。
   * @remarks MCP ツールからは公開せず、明示的なインポート処理だけで利用する。
   */
  async createIssue(input: CreateIssueInput): Promise<RedmineIssue> {
    const url = this.buildUrl('/issues.json');
    const response = await this.request<IssueResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        issue: {
          project_id: input.projectId,
          tracker_id: input.trackerId,
          subject: input.subject,
          description: input.description,
          parent_issue_id: input.parentIssueId,
        },
      }),
    });
    return response.issue;
  }

  /**
   * 既存課題の説明と親課題を更新する。
   * @param issueId 更新対象の課題番号を指定する。
   * @param input 最新の課題内容を指定する。
   * @returns 更新完了を表す Promise を返す。
   * @remarks ステータスや進捗率は変更しない。
   */
  async updateIssue(issueId: number, input: CreateIssueInput): Promise<void> {
    const url = this.buildUrl(`/issues/${issueId}.json`);
    await this.request<void>(url, {
      method: 'PUT',
      body: JSON.stringify({
        issue: {
          tracker_id: input.trackerId,
          subject: input.subject,
          description: input.description,
          parent_issue_id: input.parentIssueId,
        },
      }),
    });
  }

  /**
   * 先行課題と後続課題の関連を作成する。
   * @param precedingIssueId 先に完了すべき課題番号を指定する。
   * @param followingIssueId 後続課題番号を指定する。
   * @returns 関連作成の完了を表す Promise を返す。
   * @remarks 同じ関連が存在しないことを呼び出し側で確認する。
   */
  async createPrecedesRelation(
    precedingIssueId: number,
    followingIssueId: number,
  ): Promise<void> {
    const url = this.buildUrl(`/issues/${precedingIssueId}/relations.json`);
    await this.request<void>(url, {
      method: 'POST',
      body: JSON.stringify({
        relation: {
          issue_to_id: followingIssueId,
          relation_type: 'precedes',
        },
      }),
    });
  }

  /**
   * Redmine API の URL を組み立てる。
   * @param path API のパスを指定する。
   * @param query クエリ文字列を指定する。
   * @returns 組み立てた URL を返す。
   * @remarks ベース URL のパスへ API パスを安全に結合する。
   */
  private buildUrl(path: string, query: Record<string, string> = {}): URL {
    const url = new URL(path, this.baseUrl);
    for (const [name, value] of Object.entries(query)) {
      url.searchParams.set(name, value);
    }
    return url;
  }

  /**
   * Redmine API へ認証付き GET リクエストを送る。
   * @param url 取得対象 URL を指定する。
   * @returns JSON を指定された型として返す。
   * @remarks エラーには API キーやレスポンス本文を含めない。
   */
  private async request<T>(url: URL, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': this.apiKey,
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => undefined)) as
        { errors?: string[] } | undefined;
      const validationMessage = errorPayload?.errors?.join('; ');
      throw new Error(
        validationMessage
          ? `Redmine request failed with status ${response.status}: ${validationMessage}`
          : `Redmine request failed with status ${response.status}.`,
      );
    }

    if (
      response.status === 204 ||
      response.headers.get('Content-Length') === '0'
    ) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
