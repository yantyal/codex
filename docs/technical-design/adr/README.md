# Architecture Decision Records

ADR は重要な技術判断、その理由、トレードオフを記録する。方針が変わった場合は過去の ADR を削除せず、新しい ADR から置き換え対象を示す。

| ID                                         | 判断                                  | 状態     |
| ------------------------------------------ | ------------------------------------- | -------- |
| [ADR-001](./001-modular-monolith.md)       | モジュラーモノリスと4層構成を採用する | Proposed |
| [ADR-002](./002-mysql-prisma.md)           | MySQL と Prisma を永続化基盤にする    | Proposed |
| [ADR-003](./003-local-compose.md)          | ローカル実行に Docker Compose を使う  | Proposed |
| [ADR-004](./004-session-authentication.md) | Cookie ベースのセッション認証を使う   | Proposed |

状態は `Proposed`、`Accepted`、`Deprecated`、`Superseded` のいずれかとする。実装チケット着手前に提案内容をレビューし、合意後に `Accepted` へ変更する。
