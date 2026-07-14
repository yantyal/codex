<script setup lang="ts">
import { onMounted, ref } from 'vue';

type EvaluationPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  theme: string;
};
type EvaluationPeriodForm = Omit<EvaluationPeriod, 'id'>;

const items = ref<EvaluationPeriod[]>([]);
const selected = ref<EvaluationPeriod | null>(null);
const editing = ref(false);
const message = ref('');
const emptyForm = (): EvaluationPeriodForm => ({
  name: '',
  startDate: '',
  endDate: '',
  theme: '',
});
const form = ref<EvaluationPeriodForm>(emptyForm());

/**
 * 所有者の評価期間をAPIから読み込む。
 * @returns 読み込み完了を表すPromise
 */
async function load(): Promise<void> {
  const response = await fetch('/api/evaluation-periods');
  const body = (await response.json()) as {
    items?: EvaluationPeriod[];
    message?: string;
  };
  items.value = body.items ?? [];
  message.value = response.ok
    ? ''
    : (body.message ?? '評価期間を取得できませんでした。');
}

/**
 * 空の入力フォームを開いて新規登録を開始する。
 * @returns 戻り値はない
 */
function startCreate(): void {
  selected.value = null;
  form.value = emptyForm();
  editing.value = true;
  message.value = '';
}

/**
 * 選択した評価期間の値をフォームへ入れて編集を開始する。
 * @param period 編集する評価期間
 * @returns 戻り値はない
 */
function startEdit(period: EvaluationPeriod): void {
  selected.value = period;
  form.value = {
    ...period,
    startDate: period.startDate.slice(0, 10),
    endDate: period.endDate.slice(0, 10),
  };
  editing.value = true;
  message.value = '';
}

/**
 * フォームをAPIへ送り、成功した場合は最新の一覧を読み直す。
 * @returns 保存完了を表すPromise
 */
async function save(): Promise<void> {
  const url = selected.value
    ? `/api/evaluation-periods/${selected.value.id}`
    : '/api/evaluation-periods';
  const response = await fetch(url, {
    method: selected.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  });
  const body = (await response.json()) as { message?: string };
  if (!response.ok) {
    message.value = body.message ?? '評価期間を保存できませんでした。';
    return;
  }
  editing.value = false;
  selected.value = null;
  await load();
}

/**
 * 確認後に評価期間をアーカイブし、一覧から取り除く。
 * @param period アーカイブする評価期間
 * @returns 処理完了を表すPromise
 */
async function archive(period: EvaluationPeriod): Promise<void> {
  if (!confirm(`「${period.name}」をアーカイブしますか？`)) return;
  const response = await fetch(`/api/evaluation-periods/${period.id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    message.value = '評価期間をアーカイブできませんでした。';
    return;
  }
  await load();
}

onMounted(load);
</script>

<template>
  <section>
    <div class="view-heading">
      <div><p class="eyebrow">Evaluation</p><h1>評価期間</h1></div>
      <button class="primary-button compact" type="button" @click="startCreate">新規作成</button>
    </div>
    <p v-if="message" class="form-error" role="alert">{{ message }}</p>

    <form v-if="editing" class="goal-form" @submit.prevent="save">
      <h2>{{ selected ? '評価期間を編集' : '評価期間を登録' }}</h2>
      <label>期間名<input v-model="form.name" required maxlength="200" /></label>
      <label>開始日<input v-model="form.startDate" type="date" required /></label>
      <label>終了日<input v-model="form.endDate" type="date" required /></label>
      <label>重点テーマ<textarea v-model="form.theme" placeholder="この期間に重点的に取り組むテーマを入力してください。" /></label>
      <div>
        <button class="primary-button compact" type="submit">保存</button>
        <button class="text-button" type="button" @click="editing = false">キャンセル</button>
      </div>
    </form>

    <div v-else-if="items.length" class="goal-grid">
      <article v-for="period in items" :key="period.id" class="goal-card">
        <h2>{{ period.name }}</h2>
        <p><time>{{ period.startDate.slice(0, 10) }}</time> 〜 <time>{{ period.endDate.slice(0, 10) }}</time></p>
        <p><strong>重点テーマ:</strong> {{ period.theme || '未入力' }}</p>
        <button class="text-button" type="button" @click="startEdit(period)">編集</button>
        <button class="text-button danger" type="button" @click="archive(period)">アーカイブ</button>
      </article>
    </div>

    <section v-else-if="!editing" class="empty-state">
      <h2>評価期間はまだありません</h2>
      <p>「新規作成」から期間名、開始・終了日、重点テーマを登録してください。</p>
    </section>
  </section>
</template>
