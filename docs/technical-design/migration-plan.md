# 現行構成からの移行計画

## 現在の状態

現在はルート直下の `server.ts` と `db.ts` で、Express、`node:sqlite`、アクセス回数のデモ機能を実装している。これは Career Growth Manager の業務要件ではないため、新アーキテクチャの基盤が動いた時点で削除する。

SQLite データを MySQL へ移行する必要はない。現在の `visits` データはデモデータとして破棄可能とする。

## 移行ステップ

| 順序 | 作業                                                                  | 完了条件                                               |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | npm workspaces と `apps/web`、`apps/api`、`packages/contracts` を作る | 各 workspace の build と test が実行できる。           |
| 2    | API の4層ディレクトリ、DI、環境変数検証、ヘルスチェックを作る         | DB 不要の live と MySQL を見る ready が分かれる。      |
| 3    | Docker Compose に MySQL を追加する                                    | ローカル PC で API と MySQL を一括起動できる。         |
| 4    | Prisma schema と migration、Repository 統合テストを作る               | Testcontainers MySQL で migration と CRUD が成功する。 |
| 5    | Vue 3 のアプリシェルと API クライアントを作る                         | ログイン前後の画面骨格が表示できる。                   |
| 6    | 最初の縦切り機能としてキャリア目標の作成を TDD で実装する             | UI→API→UseCase→Domain→MySQL の一連テストが通る。       |
| 7    | 既存のアクセス回数デモを削除する                                      | `/visits`、`db.ts`、SQLite テストと説明が存在しない。  |
| 8    | README と CI を新コマンドへ更新する                                   | 初参加者が README だけで起動・テストできる。           |
| 9    | 既存コンテナ／K8s 資産を新構成へ合わせる                              | ローカル MVP 完成後、別チケットで実施する。            |

## 削除対象

- ルートの `db.ts`
- `server.ts` の `visits` 処理と SQLite 生成処理
- `server.test.ts` の SQLite／アクセス回数テスト
- README の SQLite DB 設定
- `.gitignore` の SQLite 指定は害がなく、必要に応じて履歴 DB の誤登録防止として残してもよい。
- `CHANGELOG.md` の過去リリース記録は履歴なので削除しない。

## リスクと対策

| リスク                                     | 対策                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| 大規模な一括配置換えでテストが長期間壊れる | キャリア目標の縦切りが動くまで既存 health check を残し、小さく移行する。 |
| DDD の抽象化が先行する                     | 実際のユースケースから必要な集約と port だけを追加する。                 |
| Repository の fake と MySQL 実装が異なる   | MySQL 統合テストを必須にし、fake はユースケースの分岐確認に限定する。    |
| Prisma 型がドメインへ漏れる                | Mapper を infrastructure に置き、import 制約を CI で確認する。           |
| ローカル専用設計になる                     | 状態を MySQL に置き、ファイル永続化やインメモリセッションを避ける。      |
