# Redmine 連携

## 現在の対応範囲

- Redmine 6.1 と MySQL 8.4 を Docker Compose でローカル起動する。
- REST API、Career Growth Manager プロジェクト、Codex 用ステータスを初期化する。
- stdio MCP サーバーからプロジェクトと課題を読み取る。
- API キーを Git 管理ファイルや Codex 設定へ保存しない。

MVP 開発チケットの登録、課題更新、自動作業は次段階で実装する。現在の MCP は読み取り専用とする。

## 起動

初回起動時、`.env.redmine` にローカル専用のランダムな認証情報を生成する。このファイルは Git 管理対象外とし、内容を課題やログへ貼り付けない。

```powershell
npm run redmine:start
```

起動後、ブラウザで `http://localhost:8080` を開ける。管理者パスワードは `.env.redmine` の `REDMINE_ADMIN_PASSWORD` から確認する。通常のMCP利用では管理者パスワードを使わない。

## MCP のビルド

```powershell
cd tools/redmine-mcp
npm install
cd ../..
npm run redmine:mcp:test
npm run redmine:mcp:smoke
```

プロジェクトの `.codex/config.toml` には `redmine` MCP サーバーを登録済みである。設定の追加後は Codex を再起動またはワークスペースを再読み込みする。

公開するツールは次の3つとする。

| ツール                  | 用途                                               |
| ----------------------- | -------------------------------------------------- |
| `list_redmine_projects` | Redmine プロジェクトを取得する。                   |
| `list_redmine_issues`   | プロジェクト、ステータスを指定して課題を取得する。 |
| `read_redmine_issue`    | 課題番号から詳細と受入条件を取得する。             |

## 停止

```powershell
npm run redmine:stop
```

この操作はコンテナだけを停止・削除し、named volume の MySQL データと添付ファイルは残す。データも削除する `down --volumes` は自動実行しない。

## 次段階

1. Redmine にMVP開発チケットを登録するインポート処理を作る。
2. 課題本文を「目的・背景・対応範囲・対象外・受入条件・テスト」の定型構造にする。
3. 課題更新用 MCP ツールを追加する。
4. 「AI 対応待ち」から「AI 対応中」への排他的な取得方法を決める。
5. Codex が実装結果をコメントし、「レビュー待ち」まで更新する。

自動処理では、削除、依存関係のメジャーアップデート、DB マイグレーションを行わない。
