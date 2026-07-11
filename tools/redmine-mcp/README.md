# Redmine MCP Server

ローカルの Career Growth Manager 用 Redmine から、プロジェクトと課題を読み取る stdio MCP サーバーです。

## 公開ツール

- `list_redmine_projects`: 参照可能なプロジェクトを一覧表示する。
- `list_redmine_issues`: プロジェクトとステータスで課題を一覧表示する。
- `read_redmine_issue`: 課題番号を指定して詳細を表示する。

現段階では安全のため読み取り専用です。課題作成、ステータス更新、コメント追加は MVP チケット移行と自動作業フローを設計した後に追加します。

## 開発コマンド

```powershell
cd tools/redmine-mcp
npm install
npm run check
```

通常は Codex が `scripts/start-redmine-mcp.ps1` を経由して起動します。このスクリプトは Redmine コンテナから API キーを取得してプロセス環境へ渡し、キーを設定ファイルへ保存しません。
