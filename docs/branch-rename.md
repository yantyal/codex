# ブランチ名を main に変更する手順

この手順は、既定ブランチ名を `master` から `main` に変更するときに使う。

## 1. 作業前の確認

作業ツリーに未コミットの変更がないことを確認する。

```powershell
git status --short --branch
```

変更が残っている場合は、先にコミットするか退避する。

## 2. ローカルブランチ名を変更する

現在 `master` ブランチにいる状態で、ローカルブランチ名を `main` に変更する。

```powershell
git branch -m master main
```

## 3. main ブランチをリモートへ push する

`main` ブランチを `origin` に push し、今後の push 先として設定する。

```powershell
git push -u origin main
```

## 4. GitHub の既定ブランチを変更する

GitHub の画面で、リポジトリの既定ブランチを `master` から `main` に変更する。

1. GitHub のリポジトリを開く
2. `Settings` を開く
3. `Branches` を開く
4. `Default branch` を `main` に変更する

既定ブランチを変更する前に `master` を削除しようとすると、GitHub 側で拒否されることがある。

## 5. 古い master ブランチを削除する

GitHub の既定ブランチを `main` に変更したあと、不要になった `master` ブランチを削除する。

```powershell
git push origin --delete master
```

## 6. 他の作業者がローカル設定を更新する

すでにこのリポジトリを clone している作業者は、次のコマンドでローカル設定を更新する。

```powershell
git fetch origin
git branch -m master main
git branch -u origin/main main
git remote set-head origin -a
```

`git branch -m master main` は、ローカルに `master` がある場合に実行する。
