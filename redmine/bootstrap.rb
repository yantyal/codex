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

project = Project.find_or_initialize_by(identifier: 'career-growth-manager')
project.name = 'Career Growth Manager'
project.description = 'Career Growth Manager の MVP 開発を管理する。'
project.is_public = false
project.status = Project::STATUS_ACTIVE
project.enabled_module_names = %w[issue_tracking time_tracking wiki]
project.trackers = Tracker.all
project.save!

puts 'Redmine bootstrap completed.'
