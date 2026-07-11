import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const apiKey = process.env.REDMINE_API_KEY;
if (!apiKey) {
  throw new Error('REDMINE_API_KEY is required.');
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('./server.js', import.meta.url))],
  env: {
    ...process.env,
    REDMINE_URL: process.env.REDMINE_URL ?? 'http://localhost:8080',
    REDMINE_API_KEY: apiKey,
  } as Record<string, string>,
});

const client = new Client({ name: 'redmine-mcp-smoke', version: '0.1.0' });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const projectsResult = await client.callTool({
    name: 'list_redmine_projects',
    arguments: {},
  });
  const issuesResult = await client.callTool({
    name: 'list_redmine_issues',
    arguments: {
      projectId: 'career-growth-manager',
      statusId: '*',
      limit: 100,
    },
  });

  const toolNames = tools.tools.map((tool) => tool.name).sort();
  const projects = projectsResult.structuredContent as
    { total_count?: number } | undefined;
  const issues = issuesResult.structuredContent as
    { total_count?: number } | undefined;
  process.stdout.write(
    `${JSON.stringify(
      {
        connected: true,
        toolNames,
        projectCount: projects?.total_count,
        issueCount: issues?.total_count,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.close();
}
