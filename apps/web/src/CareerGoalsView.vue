<script setup lang="ts">
import { onMounted, ref } from 'vue';
type Goal = { id: string; name: string; targetRole: string; dueDate: string; reason: string; currentState: string; targetState: string; priority: string; status: string };
const items = ref<Goal[]>([]); const selected = ref<Goal | null>(null); const message = ref(''); const editing = ref(false);
const form = ref({ name: '', targetRole: '', dueDate: '', reason: '', currentState: '', targetState: '', priority: 'medium', status: 'not_started' });
async function load() { const response = await fetch('/api/career-goals'); const body = await response.json() as { items?: Goal[]; message?: string }; items.value = body.items ?? []; message.value = response.ok ? '' : body.message ?? '一覧を取得できませんでした。'; }
function startCreate() { selected.value = null; editing.value = true; form.value = { name: '', targetRole: '', dueDate: '', reason: '', currentState: '', targetState: '', priority: 'medium', status: 'not_started' }; }
function startEdit(goal: Goal) { selected.value = goal; editing.value = true; form.value = { ...goal, dueDate: goal.dueDate.slice(0, 10) }; }
async function save() { const url = selected.value ? `/api/career-goals/${selected.value.id}` : '/api/career-goals'; const response = await fetch(url, { method: selected.value ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.value) }); const body = await response.json() as { message?: string }; if (!response.ok) { message.value = body.message ?? '保存できませんでした。'; return; } editing.value = false; selected.value = null; await load(); }
async function archive(goal: Goal) { if (!confirm(`「${goal.name}」をアーカイブしますか？`)) return; const response = await fetch(`/api/career-goals/${goal.id}`, { method: 'DELETE' }); if (!response.ok) { message.value = 'アーカイブできませんでした。'; return; } selected.value = null; await load(); }
onMounted(load);
</script>
<template>
  <section>
    <div class="view-heading"><div><p class="eyebrow">Career</p><h1>キャリア目標</h1></div><button class="primary-button compact" type="button" @click="startCreate">新規作成</button></div>
    <p v-if="message" class="form-error" role="alert">{{ message }}</p>
    <form v-if="editing" class="goal-form" @submit.prevent="save">
      <h2>{{ selected ? 'キャリア目標を編集' : 'キャリア目標を登録' }}</h2>
      <label>目標名<input v-model="form.name" required maxlength="200" /></label><label>目指す役割<input v-model="form.targetRole" required maxlength="200" /></label><label>期限<input v-model="form.dueDate" type="date" required /></label>
      <label>設定理由<textarea v-model="form.reason" /></label><label>現在の状態<textarea v-model="form.currentState" /></label><label>目標の状態<textarea v-model="form.targetState" /></label>
      <label>優先度<select v-model="form.priority"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
      <label>ステータス<select v-model="form.status"><option value="not_started">未着手</option><option value="in_progress">進行中</option><option value="achieved">達成</option><option value="on_hold">保留</option></select></label>
      <div><button class="primary-button compact" type="submit">保存</button><button class="text-button" type="button" @click="editing = false">キャンセル</button></div>
    </form>
    <div v-else-if="items.length" class="goal-grid"><article v-for="goal in items" :key="goal.id" class="goal-card" @click="selected = goal"><h2>{{ goal.name }}</h2><p>{{ goal.targetRole }}</p><p>期限: {{ goal.dueDate.slice(0, 10) }}</p><button class="text-button" type="button" @click.stop="startEdit(goal)">編集</button><button class="text-button danger" type="button" @click.stop="archive(goal)">アーカイブ</button></article></div>
    <section v-else-if="!editing" class="empty-state"><h2>キャリア目標はまだありません</h2><p>「新規作成」から、目指す役割と期限を登録してください。</p></section>
    <section v-if="selected && !editing" class="goal-detail"><h2>{{ selected.name }}</h2><p><strong>目指す役割:</strong> {{ selected.targetRole }}</p><p><strong>設定理由:</strong> {{ selected.reason || '未入力' }}</p><p><strong>現在:</strong> {{ selected.currentState || '未入力' }}</p><p><strong>目標:</strong> {{ selected.targetState || '未入力' }}</p></section>
  </section>
</template>
