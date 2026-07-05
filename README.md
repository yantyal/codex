# Minimal Express App

## ローカルでの確認手順

依存関係をインストールします。

```powershell
npm install
```

テストを実行します。

```powershell
npm test
```

ESLint で静的チェックを実行します。

```powershell
npm run lint
```

Prettier でコードを整形します。

```powershell
npm run format
```

Prettier でフォーマットがそろっているか確認します。

```powershell
npm run format:check
```

npm audit で重大度 high 以上の脆弱性を確認します。

```powershell
npm run audit
```

アプリを起動する場合は、次のコマンドを実行します。

```powershell
npm start
```

起動後、別の PowerShell から `/health` を確認できます。

```powershell
curl http://localhost:3000/health
```

`{"status":"ok"}` が返れば正常です。

## CI

GitHub Actions の CI は、次のタイミングで実行されます。

- `master` ブランチに push したとき
- Pull Request を作成または更新したとき

CI では Node.js をセットアップし、次の順番でチェックを実行します。

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm test`
5. `npm run audit`

CI が失敗した場合は、まず失敗した step 名を確認してください。
`Run lint` で失敗した場合はコードの書き方、`Check formatting` で失敗した場合は `npm run format` の実行漏れ、`Run tests` で失敗した場合はテスト結果、`Run audit` で失敗した場合は依存関係の脆弱性を確認します。

## 起動方法

```sh
npm start
```

デフォルトでは `http://localhost:3000` で起動します。
別のポートで起動する場合は `PORT` 環境変数を指定してください。

## 確認方法

```sh
curl http://localhost:3000/
```

`Hello Express` が返れば成功です。

```sh
curl http://localhost:3000/health
```

`{"status":"ok"}` が返れば成功です。

## Codex 用設定

このプロジェクトでは、Codex が安全に作業しやすいように、次の2つのファイルを用意しています。

- `.codex/config.toml`
- `AGENTS.md`

### `.codex/config.toml` の役割

`.codex/config.toml` は、このプロジェクト専用の Codex 設定ファイルです。

このファイルでは、Codex がどのような権限で作業するかを指定します。プロジェクトごとに設定を分けることで、他のプロジェクトに影響しにくくなります。

### `AGENTS.md` の役割

`AGENTS.md` は、Codex がこのプロジェクトで作業するときに守るルールを書いたファイルです。

たとえば、既存コードを大きく壊さないこと、変更前に関連ファイルを確認すること、README やコメントを初心者にも分かるように書くことなどをまとめています。

### 承認モード `approval_policy = "on-request"` の意味

`approval_policy = "on-request"` は、Codex が権限の必要な操作を行う前に、利用者へ承認を求める設定です。

たとえば、ファイルの書き換えや外部コマンドの実行など、確認が必要な操作では勝手に進めず、必要に応じて承認を求めます。

### サンドボックスモード `sandbox_mode = "workspace-write"` の意味

`sandbox_mode = "workspace-write"` は、Codex がこのプロジェクトのワークスペース内でファイルを読み書きできる設定です。

プロジェクト外のファイルまで自由に変更できる `danger-full-access` は使わず、安全寄りにしています。

### このプロジェクトで Codex に作業依頼するときの注意点

- 変更してほしい目的を、できるだけ具体的に書いてください。
- 触ってほしくないファイルや機能がある場合は、先に伝えてください。
- 大きな仕様変更が必要な場合は、まず方針を相談してください。
- 作業後は、Codex が説明する変更内容と確認結果を確認してください。
