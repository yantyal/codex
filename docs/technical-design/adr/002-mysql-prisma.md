# ADR-002: MySQL と Prisma を永続化基盤にする

- 状態: Proposed
- 決定日: 2026-07-11

## コンテキスト

目標、日次実績、評価資料には関連とトランザクションが多く、将来の EKS では Pod 外部に永続化する必要がある。開発者は TypeScript を中心に実装する。

## 決定

MySQL をデータベースとし、Prisma をスキーマ管理、マイグレーション、インフラストラクチャ層の DB アクセスに利用する。

## 結果

- TypeScript から型付きで DB を扱い、マイグレーションを履歴管理できる。
- Prisma の型や例外がドメインへ漏れないよう Mapper と Repository が必要になる。
- MySQL 固有の動作を確認するため、SQLite 代替ではなく MySQL 統合テストが必要になる。
- 複雑な集約クエリは Prisma だけに固執せず、Query Service 内で安全な SQL の利用を検討できる。
