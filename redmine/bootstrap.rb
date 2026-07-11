# Redmine の REST API、作業ステータス、対象プロジェクトを初期化する。
Setting.rest_api_enabled = '1'

admin = User.find_by!(login: 'admin')
admin.password = ENV.fetch('REDMINE_ADMIN_PASSWORD')
admin.password_confirmation = ENV.fetch('REDMINE_ADMIN_PASSWORD')
admin.must_change_passwd = false
admin.save!

['要確認', 'AI 対応待ち', 'AI 対応中', 'レビュー待ち'].each do |name|
  IssueStatus.find_or_create_by!(name: name)
end

default_status = IssueStatus.find_by!(name: '要確認')
trackers = [
  ['Epic', '複数のMVPチケットをまとめ、全体の完了条件を管理する。', true],
  ['機能', '利用者へ提供する業務機能を管理する。', true],
  ['技術タスク', '開発基盤、データ構造、共通技術を管理する。', false],
  ['テスト・品質', 'テスト、セキュリティ、品質確認を管理する。', false],
  ['ドキュメント', '設計、運用、リリース手順などの文書を管理する。', false]
]

trackers.each_with_index do |(name, description, is_in_roadmap), index|
  tracker = Tracker.find_or_initialize_by(name: name)
  tracker.description = description
  tracker.position = index + 1
  tracker.is_in_roadmap = is_in_roadmap
  tracker.default_status_id = default_status.id
  tracker.save!
end

unless IssuePriority.where(is_default: true, active: true).exists?
  priority = IssuePriority.find_or_initialize_by(name: '通常')
  priority.position = 1
  priority[:is_default] = true
  priority[:active] = true
  priority.save!
end

project = Project.find_or_initialize_by(identifier: 'career-growth-manager')
project.name = 'Career Growth Manager'
project.description = 'Career Growth Manager の MVP 開発を管理する。'
project.is_public = false
project.status = Project::STATUS_ACTIVE
project.enabled_module_names = %w[issue_tracking time_tracking wiki]
project.save!
project.tracker_ids = Tracker.pluck(:id)

puts 'Redmine bootstrap completed.'
