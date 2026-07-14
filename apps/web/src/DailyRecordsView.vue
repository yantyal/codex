<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

type Goal = { id: string; name: string; calculationType: string };
type Milestone = { id: string; name: string };
type DailyRecord = {
  id: string; goalId: string; milestoneId: string | null; activityDate: string;
  description: string; workMinutes: number; progressAmount: number | null;
  learned: string; issue: string; nextAction: string;
};
type DailyRecordForm = Omit<DailyRecord, 'id'>;

const props = defineProps<{ ownerKey: string }>();
const items = ref<DailyRecord[]>([]);
const goals = ref<Goal[]>([]);
const milestones = ref<Milestone[]>([]);
const selected = ref<DailyRecord | null>(null);
const editing = ref(false);
const ready = ref(false);
const message = ref('');
const saveState = ref('入力するとこの端末へ自動保存します。');
const today = (): string => new Date().toLocaleDateString('en-CA');
const emptyForm = (): DailyRecordForm => ({
  goalId: '', milestoneId: null, activityDate: today(), description: '',
  workMinutes: 0, progressAmount: null, learned: '', issue: '', nextAction: '',
});
const form = ref<DailyRecordForm>(emptyForm());
const draftKey = `daily-record-draft:${props.ownerKey}`;

/** 日次実績と選択可能な目標をAPIから読み込む。 */
async function load(): Promise<void> {
  const [recordResponse, goalResponse] = await Promise.all([fetch('/api/daily-records'), fetch('/api/goals')]);
  const recordBody = (await recordResponse.json()) as { items?: DailyRecord[]; message?: string };
  const goalBody = (await goalResponse.json()) as { items?: Goal[] };
  items.value = recordBody.items ?? [];
  goals.value = goalBody.items ?? [];
  message.value = recordResponse.ok ? '' : (recordBody.message ?? '日次実績を取得できませんでした。');
}

/** 選択目標に属するマイルストーンだけを読み込む。 */
async function loadMilestones(): Promise<void> {
  milestones.value = [];
  form.value.milestoneId = null;
  const goal = goals.value.find(({ id }) => id === form.value.goalId);
  if (!goal || goal.calculationType !== 'milestone') return;
  const response = await fetch(`/api/milestones?goalId=${encodeURIComponent(goal.id)}`);
  const body = (await response.json()) as { items?: Milestone[] };
  if (response.ok) milestones.value = body.items ?? [];
}

/** 現在の入力途中データを利用者別にブラウザへ保存する。 */
function autosave(): void {
  if (!ready.value || !editing.value) return;
  const savedAt = new Date().toISOString();
  localStorage.setItem(draftKey, JSON.stringify({ form: form.value, savedAt }));
  saveState.value = `入力途中を自動保存しました: ${new Date(savedAt).toLocaleTimeString()}`;
}

/** ブラウザに残った入力途中データをフォームへ復元する。 */
async function restoreDraft(): Promise<void> {
  const stored = localStorage.getItem(draftKey);
  if (!stored) return;
  try {
    const draft = JSON.parse(stored) as { form: DailyRecordForm; savedAt: string };
    form.value = draft.form;
    editing.value = true;
    await loadMilestones();
    form.value.milestoneId = draft.form.milestoneId;
    saveState.value = `入力途中を復元しました: ${new Date(draft.savedAt).toLocaleString()}`;
  } catch { localStorage.removeItem(draftKey); }
}

/** 空のフォームを開いて新しい日次実績の入力を開始する。 */
function startCreate(): void { selected.value = null; form.value = emptyForm(); editing.value = true; message.value = ''; }

/** 選択した日次実績をフォームへ入れて編集を開始する。 */
async function startEdit(record: DailyRecord): Promise<void> {
  selected.value = record;
  form.value = { ...record, activityDate: record.activityDate.slice(0, 10) };
  editing.value = true; message.value = '';
  const milestoneId = record.milestoneId;
  await loadMilestones(); form.value.milestoneId = milestoneId;
}

/** 入力した日次実績をAPIへ保存して端末上の下書きを削除する。 */
async function save(): Promise<void> {
  const response = await fetch(selected.value ? `/api/daily-records/${selected.value.id}` : '/api/daily-records', {
    method: selected.value ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.value),
  });
  const body = (await response.json()) as { message?: string };
  if (!response.ok) { message.value = body.message ?? '日次実績を保存できませんでした。'; return; }
  localStorage.removeItem(draftKey); saveState.value = '登録内容を保存しました。';
  editing.value = false; selected.value = null; await load();
}

/** 入力途中データを破棄して一覧へ戻る。 */
function cancel(): void { localStorage.removeItem(draftKey); editing.value = false; selected.value = null; saveState.value = '入力途中データを破棄しました。'; }

/** 確認後に日次実績をアーカイブする。 */
async function archive(record: DailyRecord): Promise<void> {
  if (!confirm(`${record.activityDate.slice(0, 10)}の日次実績をアーカイブしますか？`)) return;
  const response = await fetch(`/api/daily-records/${record.id}`, { method: 'DELETE' });
  if (!response.ok) { message.value = '日次実績をアーカイブできませんでした。'; return; }
  await load();
}

/** 目標IDを一覧表示用の名称へ変換する。 */
function goalName(goalId: string): string { return goals.value.find(({ id }) => id === goalId)?.name ?? '目標'; }

watch(form, autosave, { deep: true });
onMounted(async () => { await load(); await restoreDraft(); ready.value = true; });
</script>

<template>
  <section>
    <div class="view-heading"><div><p class="eyebrow">Daily records</p><h1>日次実績</h1></div><button class="primary-button compact" type="button" @click="startCreate">今日の実績を入力</button></div>
    <p v-if="message" class="form-error" role="alert">{{ message }}</p>
    <p class="autosave-state" aria-live="polite">{{ saveState }}</p>

    <form v-if="editing" class="goal-form" @submit.prevent="save">
      <h2>{{ selected ? '日次実績を編集' : '日次実績を登録' }}</h2>
      <label>実施日<input v-model="form.activityDate" type="date" :max="today()" required /></label>
      <label>対象目標<select v-model="form.goalId" required @change="loadMilestones"><option value="">選択してください</option><option v-for="goal in goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option></select></label>
      <label v-if="milestones.length">対象マイルストーン<select v-model="form.milestoneId"><option :value="null">未選択</option><option v-for="milestone in milestones" :key="milestone.id" :value="milestone.id">{{ milestone.name }}</option></select></label>
      <label>作業時間（分）<input v-model.number="form.workMinutes" type="number" min="0" max="1440" step="1" required /></label>
      <label>進捗量<input v-model.number="form.progressAmount" type="number" min="0" step="0.01" /></label>
      <label class="full-field">実施内容<textarea v-model="form.description" required maxlength="4000" /></label>
      <label class="full-field">学んだこと<textarea v-model="form.learned" maxlength="2000" /></label>
      <label class="full-field">困りごと<textarea v-model="form.issue" maxlength="2000" /></label>
      <label class="full-field">次の行動<textarea v-model="form.nextAction" maxlength="2000" /></label>
      <div><button class="primary-button compact" type="submit">登録</button><button class="text-button" type="button" @click="cancel">入力を破棄</button></div>
    </form>

    <div v-else-if="items.length" class="daily-record-list">
      <article v-for="record in items" :key="record.id" class="goal-card">
        <span class="status-badge">{{ record.activityDate.slice(0, 10) }}</span><h2>{{ goalName(record.goalId) }}</h2>
        <p>{{ record.description }}</p><p>作業時間 {{ record.workMinutes }}分<span v-if="record.progressAmount !== null"> / 進捗量 {{ record.progressAmount }}</span></p>
        <button class="text-button" type="button" @click="startEdit(record)">編集</button><button class="text-button danger" type="button" @click="archive(record)">アーカイブ</button>
      </article>
    </div>
    <section v-else class="empty-state"><h2>日次実績はまだありません</h2><p>「今日の実績を入力」から、目標に対する活動を記録してください。</p></section>
  </section>
</template>
