# ADR-003: ローカル実行に Docker Compose を使う

- 状態: Proposed
- 決定日: 2026-07-11

## コンテキスト

初期版は Windows のローカル PC で起動する。Web、API、MySQL のバージョン差とセットアップ手順を減らし、将来コンテナ環境へ移行しやすくしたい。

## 決定

Docker Compose で Web、API、MySQL を起動する。開発時の高速な再読み込みと、本番相当イメージによる確認を別 profile または別 compose 設定で扱う。

## 結果

- Windows を含む開発環境で再現しやすくなる。
- Docker Desktop 等の導入が必要になる。
- DB をホストへ直接公開しない本番に近いネットワーク構成を作れる。
- 既存 K8s ファイルは MVP のローカル構成完成後に更新する。
