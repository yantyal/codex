import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RedmineClient } from './redmine-client.js';

const redmineUrl = process.env.REDMINE_URL ?? 'http://localhost:8080';
const redmineApiKey = process.env.REDMINE_API_KEY;

if (!redmineApiKey) {
  throw new Error('REDMINE_API_KEY is required.');
}

const client = new RedmineClient(redmineUrl, redmineApiKey);
const server = new McpServer(
  {
    name: 'career-growth-redmine',
    version: '0.1.0',
  },
  {
    instructions:
      'Read Redmine projects and issues. This server is read-only. Call list_redmine_issues before read_redmine_issue when selecting work.',
  },
);

server.registerTool(
  'list_redmine_projects',
  {
    title: 'List Redmine projects',
    description: 'List projects visible to the configured Redmine API user.',
    inputSchema: z.object({}),
  },
  async () => {
    const result = await client.listProjects();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
);

server.registerTool(
  'list_redmine_issues',
  {
    title: 'List Redmine issues',
    description:
      'List Redmine issues by project and status. Use statusId="*" to include every status.',
    inputSchema: z.object({
      projectId: z.string().default('career-growth-manager'),
      statusId: z.string().default('*'),
      limit: z.number().int().min(1).max(100).default(100),
    }),
  },
  async ({ projectId, statusId, limit }) => {
    const result = await client.listIssues(projectId, statusId, limit);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
);

server.registerTool(
  'read_redmine_issue',
  {
    title: 'Read a Redmine issue',
    description:
      'Read one Redmine issue including its description, status, priority, assignee, and dates.',
    inputSchema: z.object({
      issueId: z.number().int().positive(),
    }),
  },
  async ({ issueId }) => {
    const issue = await client.getIssue(issueId);
    return {
      content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
      structuredContent: issue,
    };
  },
);

/**
 * Redmine 読み取り用 MCP サーバーを stdio で起動する。
 * @returns 起動処理の Promise を返す。
 * @remarks stdout は MCP 通信専用とし、ログを出力しない。
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

await main();
