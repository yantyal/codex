<script setup lang="ts">
import { computed, ref } from 'vue';
import { navigationItems } from './navigation';
import CareerGoalsView from './CareerGoalsView.vue';

defineProps<{ user: { name: string; email: string } }>();
const emit = defineEmits<{ logout: [] }>();
const activeId = ref('dashboard');
const mobileMenuOpen = ref(false);
const activeItem = computed(() => navigationItems.find(({ id }) => id === activeId.value) ?? navigationItems[0]);
const mobilePrimaryItems = navigationItems.filter(({ mobilePrimary }) => mobilePrimary);

/** 選択画面を切り替えてスマートフォン用メニューを閉じる。 */
function navigate(id: string): void {
  activeId.value = id;
  mobileMenuOpen.value = false;
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div><span class="eyebrow">Career Growth Manager</span><strong>{{ activeItem.label }}</strong></div>
      <div class="account"><span>{{ user.name }}</span><button type="button" class="text-button" @click="emit('logout')">ログアウト</button></div>
    </header>

    <aside class="side-navigation" aria-label="主要ナビゲーション">
      <p class="nav-title">メニュー</p>
      <button v-for="item in navigationItems" :key="item.id" type="button" :class="{ active: activeId === item.id }" @click="navigate(item.id)">{{ item.label }}</button>
    </aside>

    <main class="main-content" tabindex="-1">
      <CareerGoalsView v-if="activeId === 'career'" />
      <template v-else>
      <p class="eyebrow">{{ activeItem.shortLabel }}</p>
      <h1>{{ activeItem.label }}</h1>
      <section class="empty-state" aria-live="polite">
        <h2>表示するデータはまだありません</h2>
        <p>{{ activeItem.description }}</p>
        <p>この画面の登録・編集機能は、後続のMVPチケットで追加します。</p>
      </section>
      </template>
    </main>

    <nav class="bottom-navigation" aria-label="スマートフォン用ナビゲーション">
      <button v-for="item in mobilePrimaryItems" :key="item.id" type="button" :class="{ active: activeId === item.id }" @click="navigate(item.id)">{{ item.shortLabel }}</button>
      <button type="button" :class="{ active: mobileMenuOpen }" aria-haspopup="dialog" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">その他</button>
    </nav>

    <div v-if="mobileMenuOpen" class="mobile-menu-backdrop" @click.self="mobileMenuOpen = false">
      <section class="mobile-menu" role="dialog" aria-modal="true" aria-label="その他の画面">
        <div class="mobile-menu-heading"><h2>すべての画面</h2><button type="button" class="text-button" @click="mobileMenuOpen = false">閉じる</button></div>
        <button v-for="item in navigationItems" :key="item.id" type="button" :class="{ active: activeId === item.id }" @click="navigate(item.id)">{{ item.label }}</button>
      </section>
    </div>
  </div>
</template>
