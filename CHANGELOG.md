# Release Notes

このファイルでは、このプロジェクトの重要な変更をバージョンごとに記録する。

## v1.1.1 - リリース更新ルールの追加

- 今後の変更時に `CHANGELOG.md` の更新、バージョン更新、Git タグ作成を検討するルールを `AGENTS.md` に追加する。
- リリース対象ではない変更の場合は、その理由を作業結果に明記するルールを追加する。

## v1.1.0 - リリース運用の整備

- 重要な変更を追えるようにリリースノートを追加する。
- バージョン番号と Git タグの付け方を `docs/versioning.md` に整理する。
- 最新版のパッケージバージョンを `1.1.0` に更新する。

## v1.0.0 - Node.js + TypeScript への移行

- Express アプリ本体を `server.js` から `server.ts` に変更する。
- テストを `server.test.js` から `server.test.ts` に変更する。
- `tsconfig.json` を追加する。
- `npm run build` を追加し、`npm start` はビルド後の `dist/server.js` を起動する形に変更する。
- Jest を `ts-jest` で TypeScript 対応にする。
- ESLint を TypeScript 対応にする。
- CI に TypeScript のビルド確認を追加する。

## v0.4.0 - 既定ブランチを main に変更

- ローカルとリモートの既定ブランチ名を `main` に変更する。
- CI の push 対象ブランチを `main` に変更する。
- `docs/branch-rename.md` にブランチ名変更の手順を追加する。

## v0.3.0 - テストカバレッジ確認の追加

- Jest のカバレッジ収集コマンドを追加する。
- CI で `npm run test:coverage` を実行する。
- `coverage/` を Git 管理対象から外す。

## v0.2.0 - CI と品質チェックの整備

- GitHub Actions の CI を追加する。
- ESLint、Prettier、Jest、npm audit を CI で実行する。
- Node.js の実行環境を CI 上にセットアップする。

## v0.1.0 - 初期構成

- Express の最小構成アプリを追加する。
- `/` と `/health` のエンドポイントを追加する。
- `supertest` を使った `/health` のテストを追加する。
- README にローカルでの確認手順を追加する。
