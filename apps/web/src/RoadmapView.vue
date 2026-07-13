<script setup lang="ts">
import { onMounted, ref } from 'vue';

type RoadmapItem = {
  id: string;
  careerGoalId: string;
  skillId: string | null;
  name: string;
  plannedStartDate: string;
  plannedEndDate: string;
  sortOrder: number;
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  progressRate: number;
};
type SelectOption = { id: string; name: string };
type DependencyItem = SelectOption & { careerGoalId: string };
type RoadmapForm = Omit<RoadmapItem, 'id'>;

const items = ref<RoadmapItem[]>([]);
const careerGoals = ref<SelectOption[]>([]);
const skills = ref<SelectOption[]>([]);
const selected = ref<RoadmapItem | null>(null);
const editing = ref(false);
const message = ref('');
const displayMode = ref<'list' | 'timeline'>('timeline');
const dependencies = ref<Record<string, DependencyItem[]>>({});
const dependencyEditingId = ref<string | null>(null);
const prerequisiteItemIds = ref<string[]>([]);
const emptyForm = (): RoadmapForm => ({
  careerGoalId: careerGoals.value[0]?.id ?? '',
  skillId: null,
  name: '',
  plannedStartDate: '',
  plannedEndDate: '',
  sortOrder: 0,
  priority: 'medium',
  status: 'planned',
  progressRate: 0,
});
const form = ref<RoadmapForm>(emptyForm());

/**
 * ロードマップ項目と選択肢をAPIからまとめて読み込む。
 * @returns 読み込み完了を表すPromise
 */
async function load(): Promise<void> {
  const [itemResponse, goalResponse, skillResponse] = await Promise.all([
    fetch('/api/roadmap-items'),
    fetch('/api/career-goals'),
    fetch('/api/skills'),
  ]);
  const itemBody = (await itemResponse.json()) as {
    items?: RoadmapItem[];
    message?: string;
  };
  const goalBody = (await goalResponse.json()) as { items?: SelectOption[] };
  const skillBody = (await skillResponse.json()) as { items?: SelectOption[] };
  items.value = itemBody.items ?? [];
  careerGoals.value = goalBody.items ?? [];
  skills.value = skillBody.items ?? [];
  message.value = itemResponse.ok
    ? ''
    : (itemBody.message ?? 'ロードマップを取得できませんでした。');
  if (itemResponse.ok) await loadDependencies(items.value);
}

/**
 * 表示中の各項目に設定された前提項目をAPIから読み込む。
 * @param roadmapItems 前提項目を読み込むロードマップ項目
 * @returns 読み込み完了を表すPromise
 */
async function loadDependencies(roadmapItems: RoadmapItem[]): Promise<void> {
  const results = await Promise.all(
    roadmapItems.map(async (item) => {
      const response = await fetch(`/api/roadmap-dependencies/${item.id}`);
      const body = (await response.json()) as {
        items?: DependencyItem[];
        message?: string;
      };
      return { itemId: item.id, response, body };
    }),
  );
  dependencies.value = Object.fromEntries(
    results.map(({ itemId, body }) => [itemId, body.items ?? []]),
  );
  const failed = results.find(({ response }) => !response.ok);
  if (failed)
    message.value =
      failed.body.message ?? '前提項目を読み込めませんでした。';
}

/**
 * 空のフォームを開き、キャリア目標がない場合は登録方法を案内する。
 * @returns 戻り値はない
 */
function startCreate(): void {
  if (!careerGoals.value.length) {
    message.value = '先に「キャリア目標」画面で目標を登録してください。';
    return;
  }
  selected.value = null;
  form.value = emptyForm();
  editing.value = true;
  message.value = '';
}

/**
 * 選択した項目の値をフォームへ入れて編集を開始する。
 * @param item 編集するロードマップ項目
 * @returns 戻り値はない
 */
function startEdit(item: RoadmapItem): void {
  selected.value = item;
  form.value = {
    ...item,
    plannedStartDate: item.plannedStartDate.slice(0, 10),
    plannedEndDate: item.plannedEndDate.slice(0, 10),
  };
  editing.value = true;
  message.value = '';
}

/**
 * 現在の設定を選択状態へ反映して前提項目の編集を開始する。
 * @param item 編集するロードマップ項目
 * @returns 戻り値はない
 */
function startDependencyEdit(item: RoadmapItem): void {
  dependencyEditingId.value = item.id;
  prerequisiteItemIds.value = (dependencies.value[item.id] ?? []).map(
    ({ id }) => id,
  );
  message.value = '';
}

/**
 * 同じキャリア目標に属する自分以外の項目を選択肢として返す。
 * @param item 前提項目を設定する対象
 * @returns 選択できるロードマップ項目の配列
 */
function dependencyCandidates(item: RoadmapItem): RoadmapItem[] {
  return items.value.filter(
    (candidate) =>
      candidate.id !== item.id &&
      candidate.careerGoalId === item.careerGoalId,
  );
}

/**
 * 選択した前提項目をAPIへ送り、成功時に画面表示を更新する。
 * @param item 前提項目を設定する対象
 * @returns 保存完了を表すPromise
 */
async function saveDependencies(item: RoadmapItem): Promise<void> {
  const response = await fetch(`/api/roadmap-dependencies/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prerequisiteItemIds: prerequisiteItemIds.value }),
  });
  const body = (await response.json()) as {
    items?: DependencyItem[];
    message?: string;
  };
  if (!response.ok) {
    message.value = body.message ?? '前提項目を保存できませんでした。';
    return;
  }
  dependencies.value[item.id] = body.items ?? [];
  dependencyEditingId.value = null;
  message.value = '';
}

/**
 * フォームをAPIへ送り、成功した場合は最新の一覧を読み直す。
 * @returns 保存完了を表すPromise
 */
async function save(): Promise<void> {
  const url = selected.value
    ? `/api/roadmap-items/${selected.value.id}`
    : '/api/roadmap-items';
  const response = await fetch(url, {
    method: selected.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  });
  const body = (await response.json()) as { message?: string };
  if (!response.ok) {
    message.value = body.message ?? 'ロードマップ項目を保存できませんでした。';
    return;
  }
  editing.value = false;
  selected.value = null;
  await load();
}

/**
 * 確認後に項目をアーカイブし、一覧から取り除く。
 * @param item アーカイブするロードマップ項目
 * @returns 処理完了を表すPromise
 */
async function archive(item: RoadmapItem): Promise<void> {
  if (!confirm(`「${item.name}」をアーカイブしますか？`)) return;
  const response = await fetch(`/api/roadmap-items/${item.id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    message.value = 'ロードマップ項目をアーカイブできませんでした。';
    return;
  }
  selected.value = null;
  await load();
}

/**
 * IDに対応するキャリア目標名を返す。
 * @param id キャリア目標ID
 * @returns 表示用のキャリア目標名
 */
function careerGoalName(id: string): string {
  return careerGoals.value.find((goal) => goal.id === id)?.name ?? '不明な目標';
}

/**
 * IDに対応するスキル名を返し、未選択の場合は案内を返す。
 * @param id スキルID、または未選択を表すnull
 * @returns 表示用のスキル名
 */
function skillName(id: string | null): string {
  if (!id) return 'スキル未選択';
  return skills.value.find((skill) => skill.id === id)?.name ?? '不明なスキル';
}

/**
 * 保存値を利用者向けの日本語ステータスへ変換する。
 * @param status 保存されているステータス
 * @returns 画面へ表示する日本語名
 */
function statusLabel(status: RoadmapItem['status']): string {
  return {
    planned: '予定',
    in_progress: '進行中',
    completed: '完了',
    on_hold: '保留',
  }[status];
}

onMounted(load);
</script>

<template>
  <section>
    <div class="view-heading">
      <div><p class="eyebrow">Roadmap</p><h1>ロードマップ</h1></div>
      <button class="primary-button compact" type="button" @click="startCreate">新規作成</button>
    </div>
    <p v-if="message" class="form-error" role="alert">{{ message }}</p>

    <form v-if="editing" class="goal-form" @submit.prevent="save">
      <h2>{{ selected ? 'ロードマップ項目を編集' : 'ロードマップ項目を登録' }}</h2>
      <label>項目名<input v-model="form.name" required maxlength="200" /></label>
      <label>キャリア目標<select v-model="form.careerGoalId" required><option v-for="goal in careerGoals" :key="goal.id" :value="goal.id">{{ goal.name }}</option></select></label>
      <label>対象スキル<select v-model="form.skillId"><option :value="null">未選択</option><option v-for="skill in skills" :key="skill.id" :value="skill.id">{{ skill.name }}</option></select></label>
      <label>表示順<input v-model.number="form.sortOrder" type="number" min="0" step="1" required /></label>
      <label>開始日<input v-model="form.plannedStartDate" type="date" required /></label>
      <label>終了日<input v-model="form.plannedEndDate" type="date" required /></label>
      <label>優先度<select v-model="form.priority"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
      <label>ステータス<select v-model="form.status"><option value="planned">予定</option><option value="in_progress">進行中</option><option value="completed">完了</option><option value="on_hold">保留</option></select></label>
      <label>進捗率（%）<input v-model.number="form.progressRate" type="number" min="0" max="100" step="1" required /></label>
      <div><button class="primary-button compact" type="submit">保存</button><button class="text-button" type="button" @click="editing = false">キャンセル</button></div>
    </form>

    <template v-else-if="items.length">
      <div class="display-switch" aria-label="表示形式">
        <button type="button" :class="{ active: displayMode === 'timeline' }" @click="displayMode = 'timeline'">時系列</button>
        <button type="button" :class="{ active: displayMode === 'list' }" @click="displayMode = 'list'">一覧</button>
      </div>
      <div :class="displayMode === 'timeline' ? 'roadmap-timeline' : 'roadmap-list'">
        <article v-for="item in items" :key="item.id" class="roadmap-card">
          <div class="roadmap-period"><time>{{ item.plannedStartDate.slice(0, 10) }}</time><span>〜</span><time>{{ item.plannedEndDate.slice(0, 10) }}</time></div>
          <div><span class="status-badge">{{ statusLabel(item.status) }}</span><span class="order-label">表示順 {{ item.sortOrder }}</span></div>
          <h2>{{ item.name }}</h2>
          <p>{{ careerGoalName(item.careerGoalId) }} / {{ skillName(item.skillId) }}</p>
          <div class="prerequisite-summary">
            <strong>前提項目</strong>
            <ul v-if="dependencies[item.id]?.length">
              <li v-for="prerequisite in dependencies[item.id]" :key="prerequisite.id">{{ prerequisite.name }}</li>
            </ul>
            <p v-else>前提項目はありません</p>
          </div>
          <label class="progress-label">進捗 {{ item.progressRate }}%<progress :value="item.progressRate" max="100" /></label>
          <button class="text-button" type="button" @click="startEdit(item)">編集</button>
          <button class="text-button" type="button" @click="startDependencyEdit(item)">前提項目を設定</button>
          <button class="text-button danger" type="button" @click="archive(item)">アーカイブ</button>
          <form v-if="dependencyEditingId === item.id" class="dependency-form" @submit.prevent="saveDependencies(item)">
            <fieldset>
              <legend>前提項目を選択</legend>
              <label v-for="candidate in dependencyCandidates(item)" :key="candidate.id"><input v-model="prerequisiteItemIds" type="checkbox" :value="candidate.id" />{{ candidate.name }}</label>
              <p v-if="!dependencyCandidates(item).length">同じキャリア目標に選択できる項目がありません。</p>
            </fieldset>
            <button class="primary-button compact" type="submit">保存</button>
            <button class="text-button" type="button" @click="dependencyEditingId = null">キャンセル</button>
          </form>
        </article>
      </div>
    </template>

    <section v-else-if="!editing" class="empty-state">
      <h2>ロードマップ項目はまだありません</h2>
      <p>「新規作成」から期間、順序、スキル、状態を登録してください。</p>
    </section>
  </section>
</template>
