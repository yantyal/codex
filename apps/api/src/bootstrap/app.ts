/**
 * API 基盤が起動可能であることを表す最小のアプリケーション情報を返す。
 * @returns API 名と状態を返す。
 * @remarks 業務機能は後続チケットで追加する。
 */
export function getApplicationInfo(): { name: string; status: 'ok' } {
  return { name: 'Career Growth Manager API', status: 'ok' };
}
