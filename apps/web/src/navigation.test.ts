import { describe, expect, test } from 'vitest';
import { navigationItems } from './navigation';

describe('responsive navigation', () => {
  test('PCナビゲーションからすべての主要画面へ移動できる', () => {
    expect(navigationItems.map(({ id }) => id)).toEqual([
      'dashboard',
      'career',
      'skills',
      'daily',
      'roadmap',
      'goals',
      'calendar',
      'evaluations',
      'settings',
    ]);
    expect(new Set(navigationItems.map(({ id }) => id)).size).toBe(
      navigationItems.length,
    );
  });

  test('375px用の下部ナビに主要4画面を表示し残りをその他へ配置する', () => {
    const primary = navigationItems.filter(
      ({ mobilePrimary }) => mobilePrimary,
    );
    const more = navigationItems.filter(({ mobilePrimary }) => !mobilePrimary);
    expect(primary.map(({ id }) => id)).toEqual([
      'dashboard',
      'career',
      'skills',
      'daily',
    ]);
    expect(more.length).toBeGreaterThan(0);
  });
});
