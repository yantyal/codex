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

`{"status":"ok","database":"ok"}` が返れば正常です。

別のポートで起動したい場合は、`PORT` 環境変数を指定します。

```powershell
$env:PORT = "4000"
npm start
```

## DB 設定

SQLite DB は既定で `data/app.sqlite` に作成する。
別の場所を使いたい場合は、`DATABASE_PATH` 環境変数を指定する。

```powershell
$env:DATABASE_PATH = "data/local.sqlite"
npm start
```

`.env`、`data/`、`*.sqlite`、`*.sqlite3` は Git 管理対象から外している。
パスワードなどの秘密情報が必要になった場合も、GitHub に公開せず、環境変数や `.env` に置く。

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

## Container

Build the Docker image.

```powershell
docker build -t codex:local .
```

Run the container locally. The SQLite database is stored in a Docker volume so that data remains after the container exits.

```powershell
docker volume create codex-data
docker run --rm -p 3000:3000 -v codex-data:/app/data codex:local
```

Check the health endpoint from another PowerShell window.

```powershell
curl http://localhost:3000/health
```

Apply the Kubernetes manifests. The initial Kubernetes setup uses one replica because SQLite is stored on a single persistent volume.

```powershell
kubectl apply -f k8s/
kubectl get pods
```

When using an image registry, update `image` in `k8s/deployment.yaml`, for example `registry.example.com/codex:1.3.0`.

The current Kubernetes architecture diagram is available at `docs/architecture.drawio`.
