# Minimal Express App

Node.js と TypeScript で作った、最小構成の Express アプリです。

## セットアップ

依存関係をインストールします。

```powershell
npm install
```

## よく使うコマンド

TypeScript を JavaScript に変換します。変換後のファイルは `dist/` に作られます。

```powershell
npm run build
```

テストを実行します。

```powershell
npm test
```

テストカバレッジを確認します。

```powershell
npm run test:coverage
```

ESLint でコードの問題を確認します。

```powershell
npm run lint
```

Prettier でコードを整形します。

```powershell
npm run format
```

Prettier の整形ルールに合っているか確認します。

```powershell
npm run format:check
```

重大度 high 以上の脆弱性が依存関係にないか確認します。

```powershell
npm run audit
```

## 起動方法

アプリを起動します。`npm start` は先に `npm run build` を実行してから、`dist/server.js` を起動します。

```powershell
npm start
```

起動後、別の PowerShell から `/health` を確認できます。

```powershell
curl http://localhost:3000/health
```

`{"status":"ok"}` が返れば正常です。

別のポートで起動したい場合は、`PORT` 環境変数を指定します。

```powershell
$env:PORT = "4000"
npm start
```

## CI

GitHub Actions の CI は、次のタイミングで実行されます。

- `main` ブランチに push したとき
- Pull Request を作成または更新したとき

CI では次の順番で確認します。

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run build`
5. `npm run test:coverage`
6. `npm run audit`
