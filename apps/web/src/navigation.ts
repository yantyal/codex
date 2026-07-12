export type NavigationItem = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  mobilePrimary: boolean;
};

/** PCとスマートフォンで共通利用する主要画面の定義を保持する。 */
export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    shortLabel: 'ホーム',
    description: '目標や活動の状況をまとめて確認する画面です。',
    mobilePrimary: true,
  },
  {
    id: 'career',
    label: 'キャリア目標',
    shortLabel: 'キャリア',
    description: '中長期のキャリア目標を管理する画面です。',
    mobilePrimary: true,
  },
  {
    id: 'skills',
    label: 'スキル',
    shortLabel: 'スキル',
    description: '現在と目標のスキルレベルを管理する画面です。',
    mobilePrimary: true,
  },
  {
    id: 'daily',
    label: '日次実績',
    shortLabel: '実績',
    description: '今日の活動、成果、学びを記録する画面です。',
    mobilePrimary: true,
  },
  {
    id: 'roadmap',
    label: 'ロードマップ',
    shortLabel: 'ロードマップ',
    description: 'キャリア目標までの計画を確認する画面です。',
    mobilePrimary: false,
  },
  {
    id: 'goals',
    label: '目標',
    shortLabel: '目標',
    description: '実行目標と進捗を管理する画面です。',
    mobilePrimary: false,
  },
  {
    id: 'calendar',
    label: '活動カレンダー',
    shortLabel: 'カレンダー',
    description: '日ごとの活動記録を確認する画面です。',
    mobilePrimary: false,
  },
  {
    id: 'evaluations',
    label: '評価資料',
    shortLabel: '評価',
    description: '評価期間と評価資料を管理する画面です。',
    mobilePrimary: false,
  },
  {
    id: 'settings',
    label: '設定',
    shortLabel: '設定',
    description: '分類、レベル、アカウント情報を管理する画面です。',
    mobilePrimary: false,
  },
];
