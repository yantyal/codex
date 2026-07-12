import { randomUUID } from 'node:crypto';
import type {
  AuditEvent,
  AuditLogger,
} from '../../domain/authorization/ownership.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Prismaを使って所有者認可の結果をMySQLへ保存する。 */
export class PrismaAuditLogger implements AuditLogger {
  /**
   * Prisma監査ロガーを作成する。
   * @param prisma 接続済みのPrismaクライアントを指定する。
   * @returns PrismaAuditLoggerのインスタンスを返す。
   * @remarks パスワード、Cookie、入力本文は保存しない。
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 認可結果を監査ログへ保存する。
   * @param event 操作者、操作、対象、結果だけを指定する。
   * @returns 保存完了を表すPromiseを返す。
   * @remarks リクエスト本文や認証情報を追加しない。
   */
  async write(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({ data: { id: randomUUID(), ...event } });
  }
}
