# ER 図

## 論理 ER 図

```mermaid
erDiagram
    USERS ||--o{ CAREER_GOALS : owns
    USERS ||--o{ SKILLS : owns
    USERS ||--o{ SKILL_CATEGORIES : configures
    USERS ||--o{ SKILL_LEVEL_DEFINITIONS : configures
    USERS ||--o{ EVALUATION_PERIODS : owns
    USERS ||--o{ GOALS : owns
    USERS ||--o{ DAILY_RECORDS : owns
    USERS ||--o{ EVALUATION_REPORTS : owns
    CAREER_GOALS ||--o{ CAREER_GOAL_SKILLS : requires
    SKILLS ||--o{ CAREER_GOAL_SKILLS : linked
    SKILL_CATEGORIES ||--o{ SKILLS : classifies
    CAREER_GOALS ||--o{ ROADMAP_ITEMS : contains
    SKILLS o|--o{ ROADMAP_ITEMS : targets
    ROADMAP_ITEMS ||--o{ ROADMAP_DEPENDENCIES : successor
    ROADMAP_ITEMS ||--o{ ROADMAP_DEPENDENCIES : predecessor
    ROADMAP_ITEMS o|--o{ GOALS : produces
    EVALUATION_PERIODS o|--o{ GOALS : evaluates
    GOALS ||--o{ MILESTONES : contains
    GOALS ||--o{ DAILY_RECORDS : tracks
    MILESTONES o|--o{ DAILY_RECORDS : relates
    GOALS ||--o{ EVIDENCES : supports
    DAILY_RECORDS o|--o{ EVIDENCES : produces
    EVALUATION_PERIODS ||--o{ EVALUATION_REPORTS : summarizes
    EVALUATION_REPORTS ||--o{ EVALUATION_REPORT_GOALS : snapshots
    GOALS ||--o{ EVALUATION_REPORT_GOALS : source

    USERS {
        uuid id PK
        string name
        string email UK
        string password_hash
        string current_job_type
        string current_position
        string organization
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    CAREER_GOALS {
        uuid id PK
        uuid user_id FK
        string name
        string target_role
        date due_date
        text reason
        text current_state
        text target_state
        string priority
        string status
    }
    SKILLS {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        string name
        int current_level
        int target_level
        text criteria
        text notes
    }
    ROADMAP_ITEMS {
        uuid id PK
        uuid career_goal_id FK
        uuid skill_id FK
        string name
        date planned_start_date
        date planned_end_date
        int sort_order
        string priority
        string status
        decimal progress_rate
    }
    GOALS {
        uuid id PK
        uuid user_id FK
        uuid roadmap_item_id FK
        uuid evaluation_period_id FK
        string name
        string category
        string calculation_type
        date start_date
        date due_date
        decimal target_value
        decimal current_value
        string unit
        decimal weight
        string status
    }
    MILESTONES {
        uuid id PK
        uuid goal_id FK
        string name
        date due_date
        text completion_condition
        decimal weight
        string status
        date completed_date
    }
    DAILY_RECORDS {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        uuid milestone_id FK
        date activity_date
        text description
        int work_minutes
        decimal progress_amount
        text learned
        text issue
        text next_action
    }
    EVIDENCES {
        uuid id PK
        uuid goal_id FK
        uuid daily_record_id FK
        string name
        string url
        text description
        date evidence_date
        text impact
    }
    EVALUATION_PERIODS {
        uuid id PK
        uuid user_id FK
        string name
        date start_date
        date end_date
        text theme
    }
    EVALUATION_REPORTS {
        uuid id PK
        uuid user_id FK
        uuid evaluation_period_id FK
        string status
        text current_role
        text expected_role
        text summary
        datetime generated_at
    }
```

## 補助エンティティ

| エンティティ              | 主な役割・制約                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `CAREER_GOAL_SKILLS`      | `career_goal_id` と `skill_id` の複合一意制約を持つ。                                  |
| `SKILL_CATEGORIES`        | ユーザー別の名称、表示順、有効フラグを持つ。                                           |
| `SKILL_LEVEL_DEFINITIONS` | ユーザー別にレベル 1～5 の名称・説明を持つ。`user_id, level` を一意にする。            |
| `ROADMAP_DEPENDENCIES`    | 後続項目と前提項目を保持する。同一項目の指定と循環参照を禁止する。                     |
| `EVALUATION_REPORT_GOALS` | 作成時点の目標名、達成率、実績、成果、未達、振り返りをスナップショットとして保持する。 |

## 設計ルール

- UUID を外部公開 ID として利用する。
- ユーザー所有データには、直接または親を介して必ず所有ユーザーを特定できる関連を持たせる。
- 認可では URL の ID だけを信用せず、所有ユーザー条件を含めて取得する。
- 削除対象の主要テーブルには `created_at`、`updated_at`、`deleted_at` を持たせる。
- ステータス、分類、計算方式はアプリケーションで列挙値を検証する。
- 達成率は算出値を正とする。キャッシュする場合も、再計算可能な元データを保持する。
- 証跡に日次実績を指定した場合、その日次実績が同じ目標に属することを検証する。
- 評価資料は後日の元データ変更に影響されないよう、目標別結果をスナップショット保存する。

## 物理設計時に追加する主なインデックス

- `users(email)` 一意
- `career_goals(user_id, status, due_date)`
- `skills(user_id, category_id, name)` 一意
- `roadmap_items(career_goal_id, planned_start_date, sort_order)`
- `goals(user_id, status, due_date)`
- `daily_records(user_id, activity_date)`
- `daily_records(goal_id, activity_date)`
- `evidences(goal_id)`
- `evaluation_periods(user_id, start_date, end_date)`
