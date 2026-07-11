# Career Growth Manager 技術設計

## 目的

Career Growth Manager を TypeScript、MySQL、TDD、DDD を中心に実装するための技術方針を定義する。
初期リリースはローカル PC で動かし、同じアプリケーションを将来 AWS EKS へ移行できる構造にする。

## ドキュメント一覧

| ドキュメント                              | 内容                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| [全体アーキテクチャ](./architecture.md)   | 技術スタック、コンテナ、レイヤー、依存方向、処理フロー             |
| [ドメイン設計](./domain-design.md)        | 境界づけられたコンテキスト、集約、値オブジェクト、ドメインサービス |
| [テスト戦略](./testing-strategy.md)       | TDD サイクル、テスト分類、DB テスト、完了条件                      |
| [ローカル実行・EKS 移行](./deployment.md) | Docker Compose、設定、マイグレーション、将来の EKS 対応            |
| [移行計画](./migration-plan.md)           | 現在の最小 Express＋SQLite 構成からの段階的移行                    |
| [ADR](./adr/README.md)                    | 主要な設計判断と理由                                               |

## 採用方針の要約

- フロントエンドは Vue 3＋TypeScript の SPA とする。
- サーバーサイドは Express＋TypeScript の REST API とする。
- DB は MySQL とし、DB 固有処理をインフラストラクチャ層へ閉じ込める。
- バックエンドはプレゼンテーション、アプリケーション、ドメイン、インフラストラクチャの4層に分ける。
- ドメイン層はフレームワーク、HTTP、ORM、DB に依存させない。
- ローカルでは Web、API、MySQL を Docker Compose で起動する。
- 既存の `k8s/`、`infra/`、コンテナ関連ファイルは、MySQL 対応を実装する段階まで変更しない。
