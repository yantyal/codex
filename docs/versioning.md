# バージョンとタグの運用手順

このプロジェクトでは、重要な変更を追いやすくするために SemVer と Git タグを使う。

## バージョン番号の考え方

バージョン番号は `MAJOR.MINOR.PATCH` の形にする。

- `MAJOR`: TypeScript 化など、構成や使い方が大きく変わる変更で上げる。
- `MINOR`: CI、ドキュメント、運用ルールなど、機能や開発体験を追加する変更で上げる。
- `PATCH`: 誤字修正、軽微な設定修正、不具合修正で上げる。

## リリース前の確認

リリース作業を始める前に、作業ブランチが最新か確認する。

```powershell
git status --short --branch
git fetch --prune
git status --short --branch
```

`behind` と表示された場合は、先に最新化する。

```powershell
git pull --ff-only
```

## バージョンを上げる手順

`package.json` と `package-lock.json` の `version` を更新する。

```powershell
npm version 1.1.0 --no-git-tag-version
```

リリースノートを更新する。

```powershell
code CHANGELOG.md
```

確認を実行する。

```powershell
npm run lint
npm run format:check
npm run build
npm test
```

変更をコミットする。

```powershell
git add package.json package-lock.json CHANGELOG.md docs/versioning.md
git commit -m "Release v1.1.0"
```

## タグを付ける手順

リリース用のコミットに注釈付きタグを付ける。

```powershell
git tag -a v1.1.0 -m "Release v1.1.0"
```

タグを GitHub に push する。

```powershell
git push origin main
git push origin v1.1.0
```

複数のタグをまとめて push する場合は、次のコマンドを使う。

```powershell
git push origin --tags
```

## 現在のタグ一覧

このプロジェクトでは、次の区切りでタグを付ける。

| タグ   | 内容                           |
| ------ | ------------------------------ |
| v0.1.0 | 初期構成                       |
| v0.2.0 | CI と品質チェックの整備        |
| v0.3.0 | テストカバレッジ確認の追加     |
| v0.4.0 | 既定ブランチを `main` に変更   |
| v1.0.0 | Node.js + TypeScript への移行  |
| v1.1.0 | リリースノートとタグ運用の整備 |
