import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('application workspace foundation', () => {
  test('defines the planned web, API, and contracts workspaces', () => {
    // ルートの package.json を読み、npm workspaces の設定を確認する。
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, 'package.json'), 'utf8'),
    ) as { workspaces?: string[] };

    // 各責務が別の workspace として存在することを確認する。
    expect(packageJson.workspaces).toEqual(['apps/*', 'packages/*']);
    expect(existsSync(join(__dirname, 'apps/api/package.json'))).toBe(true);
    expect(existsSync(join(__dirname, 'apps/web/package.json'))).toBe(true);
    expect(existsSync(join(__dirname, 'packages/contracts/package.json'))).toBe(
      true,
    );
  });

  test('keeps a versioned MySQL migration foundation', () => {
    // Prisma の設定、スキーマ、最初の履歴が Git 管理対象にあることを確認する。
    expect(existsSync(join(__dirname, 'apps/api/prisma.config.ts'))).toBe(true);
    expect(existsSync(join(__dirname, 'apps/api/prisma/schema.prisma'))).toBe(
      true,
    );
    expect(
      existsSync(
        join(
          __dirname,
          'apps/api/prisma/migrations/20260711000000_init/migration.sql',
        ),
      ),
    ).toBe(true);
    // 開発用とテスト用の MySQL を再現する Compose 定義も必須とする。
    expect(existsSync(join(__dirname, 'compose.app.yaml'))).toBe(true);
  });
});
