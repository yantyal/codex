import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type VisitCount = {
  path: string;
  count: number;
};

export type AppDatabase = {
  recordVisit(path: string): VisitCount;
  getVisitCount(path: string): VisitCount;
  close(): void;
};

const defaultDatabasePath = 'data/app.sqlite';

/**
 * SQLite にアプリケーション用のテーブルを用意する。
 */
function initializeDatabase(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      path TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * SQLite ファイルを保存する親ディレクトリを用意する。
 */
function ensureDatabaseDirectory(databasePath: string): void {
  if (databasePath === ':memory:') {
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
}

/**
 * アプリケーションが使う SQLite データベースを作成する。
 */
export function createDatabase(
  databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath,
): AppDatabase {
  ensureDatabaseDirectory(databasePath);

  const database = new DatabaseSync(databasePath);
  initializeDatabase(database);

  return {
    recordVisit(path: string): VisitCount {
      database
        .prepare(
          `
            INSERT INTO visits (path, count, updated_at)
            VALUES (?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(path) DO UPDATE SET
              count = count + 1,
              updated_at = CURRENT_TIMESTAMP
          `,
        )
        .run(path);

      return this.getVisitCount(path);
    },

    getVisitCount(path: string): VisitCount {
      const row = database
        .prepare('SELECT path, count FROM visits WHERE path = ?')
        .get(path) as VisitCount | undefined;

      return row ?? { path, count: 0 };
    },

    close(): void {
      database.close();
    },
  };
}
