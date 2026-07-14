<script setup lang="ts">
import { onMounted, ref } from 'vue';

type GoalDraft = {
  roadmapItemId: string;
  name: string;
  startDate: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
};
type SmartWarning = {
  aspect: string;
  label: string;
  message: string;
};
type Goal = {
  id: string;
  roadmapItemId: string | null;
  evaluationPeriodId: string | null;
  name: string;
  description: string;
  category: string;
  calculationType: 'numeric' | 'milestone' | 'habit' | 'manual';
  startDate: string;
  dueDate: string;
  completionCondition: string;
  measurementMethod: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  plannedDays: number | null;
  manualProgress: number | null;
  manualReason: string;
  priority: 'high' | 'medium' | 'low';
  weight: number;
  status: 'not_started' | 'in_progress' | 'achieved' | 'on_hold';
  smartWarnings: SmartWarning[];
};
type GoalForm = Omit<Goal, 'id' | 'smartWarnings'>;
type RoadmapOption = {
  id: string;
  name: string;
  plannedStartDate: string;
  plannedEndDate: string;
  priority: 'high' | 'medium' | 'low';
};
type PeriodOption = { id: string; name: string };

const props = defineProps<{ initialDraft?: GoalDraft | null }>();
const emit = defineEmits<{ draftConsumed: [] }>();
const items = ref<Goal[]>([]);
const roadmapItems = ref<RoadmapOption[]>([]);
const evaluationPeriods = ref<PeriodOption[]>([]);
const selected = ref<Goal | null>(null);
const editing = ref(false);
const message = ref('');
const smartWarnings = ref<SmartWarning[]>([]);
const emptyForm = (): GoalForm => ({
  roadmapItemId: null,
  evaluationPeriodId: null,
  name: '',
  description: '',
  category: '',
  calculationType: 'numeric',
  startDate: '',
  dueDate: '',
  completionCondition: '',
  measurementMethod: '',
  targetValue: null,
  currentValue: 0,
  unit: '',
  plannedDays: null,
  manualProgress: null,
  manualReason: '',
  priority: 'medium',
  weight: 1,
  status: 'not_started',
});
const form = ref<GoalForm>(emptyForm());

/**
 * 目標一覧とフォームの選択肢をAPIからまとめて読み込む。
 * @returns 読み込み完了を表すPromise
 */
async function load(): Promise<void> {
  const [goalResponse, roadmapResponse, periodResponse] = await Promise.all([
    fetch('/api/goals'),
    fetch('/api/roadmap-items'),
    fetch('/api/evaluation-periods'),
  ]);
  const goalBody = (await goalResponse.json()) as {
    items?: Goal[];
    message?: string;
  };
  const roadmapBody = (await roadmapResponse.json()) as {
    items?: RoadmapOption[];
  };
  const periodBody = (await periodResponse.json()) as {
    items?: PeriodOption[];
  };
  items.value = goalBody.items ?? [];
  roadmapItems.value = roadmapBody.items ?? [];
  evaluationPeriods.value = periodBody.items ?? [];
  message.value = goalResponse.ok
    ? ''
    : (goalBody.message ?? '目標を取得できませんでした。');
}

/**
 * 空またはロードマップ初期値入りのフォームを開く。
 * @param draft ロードマップ画面から引き継ぐ初期値
 * @returns 戻り値はない
 */
function startCreate(draft?: GoalDraft): void {
  selected.value = null;
  form.value = {
    ...emptyForm(),
    ...(draft ?? {}),
  };
  editing.value = true;
  message.value = '';
  void checkSmart();
}

/**
 * 選択した目標の値をフォームへ入れて編集を開始する。
 * @param goal 編集する目標
 * @returns 戻り値はない
 */
function startEdit(goal: Goal): void {
  selected.value = goal;
  form.value = {
    ...goal,
    startDate: goal.startDate.slice(0, 10),
    dueDate: goal.dueDate.slice(0, 10),
  };
  smartWarnings.value = goal.smartWarnings;
  editing.value = true;
  message.value = '';
}

/**
 * 新規登録中に選んだロードマップ項目から名称・期間・優先度を引き継ぐ。
 * @returns 戻り値はない
 * @remarks 既存目標の編集時は利用者の入力を勝手に上書きしない。
 */
function applyRoadmapDefaults(): void {
  if (selected.value || !form.value.roadmapItemId) return;
  const roadmap = roadmapItems.value.find(
    ({ id }) => id === form.value.roadmapItemId,
  );
  if (!roadmap) return;
  form.value.name = roadmap.name;
  form.value.startDate = roadmap.plannedStartDate.slice(0, 10);
  form.value.dueDate = roadmap.plannedEndDate.slice(0, 10);
  form.value.priority = roadmap.priority;
  void checkSmart();
}

/**
 * 現在のフォームを保存せずAPIでSMART判定する。
 * @returns 判定完了を表すPromise
 */
async function checkSmart(): Promise<void> {
  const response = await fetch('/api/goals/smart-warnings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  });
  const body = (await response.json()) as {
    warnings?: SmartWarning[];
    message?: string;
  };
  if (!response.ok) {
    message.value = body.message ?? 'SMART判定を実行できませんでした。';
    return;
  }
  smartWarnings.value = body.warnings ?? [];
}

/**
 * フォームをAPIへ送り、成功した場合は最新の一覧を読み直す。
 * @returns 保存完了を表すPromise
 */
async function save(): Promise<void> {
  const url = selected.value ? `/api/goals/${selected.value.id}` : '/api/goals';
  const response = await fetch(url, {
    method: selected.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  });
  const body = (await response.json()) as {
    smartWarnings?: SmartWarning[];
    message?: string;
  };
  if (!response.ok) {
    message.value = body.message ?? '目標を保存できませんでした。';
    await checkSmart();
    return;
  }
  editing.value = false;
  selected.value = null;
  smartWarnings.value = [];
  await load();
}

/**
 * 確認後に目標をアーカイブし、一覧から取り除く。
 * @param goal アーカイブする目標
 * @returns 処理完了を表すPromise
 */
async function archive(goal: Goal): Promise<void> {
  if (!confirm(`「${goal.name}」をアーカイブしますか？`)) return;
  const response = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' });
  if (!response.ok) {
    message.value = '目標をアーカイブできませんでした。';
    return;
  }
  await load();
}

/**
 * 保存値を利用者向けの日本語ステータスへ変換する。
 * @param status 保存されているステータス
 * @returns 画面へ表示する日本語名
 */
function statusLabel(status: Goal['status']): string {
  return {
    not_started: '未着手',
    in_progress: '進行中',
    achieved: '達成',
    on_hold: '保留',
  }[status];
}

onMounted(async () => {
  await load();
  if (props.initialDraft) {
    startCreate(props.initialDraft);
    emit('draftConsumed');
  }
});
</script>

<template>
  <section>
    <div class="view-heading">
      <div><p class="eyebrow">Goals</p><h1>目標</h1></div>
      <button class="primary-button compact" type="button" @click="startCreate()">新規作成</button>
    </div>
    <p v-if="message" class="form-error" role="alert">{{ message }}</p>

    <form v-if="editing" class="goal-form" @submit.prevent="save">
      <h2>{{ selected ? '目標を編集' : '目標を登録' }}</h2>
      <label>目標名<input v-model="form.name" required maxlength="200" /></label>
      <label>分類<input v-model="form.category" required maxlength="100" /></label>
      <label class="full-field">説明<textarea v-model="form.description" required maxlength="2000" /></label>
      <label>ロードマップ項目<select v-model="form.roadmapItemId" @change="applyRoadmapDefaults"><option :value="null">未選択</option><option v-for="roadmap in roadmapItems" :key="roadmap.id" :value="roadmap.id">{{ roadmap.name }}</option></select></label>
      <label>評価期間<select v-model="form.evaluationPeriodId"><option :value="null">未選択</option><option v-for="period in evaluationPeriods" :key="period.id" :value="period.id">{{ period.name }}</option></select></label>
      <label>開始日<input v-model="form.startDate" type="date" required /></label>
      <label>期限<input v-model="form.dueDate" type="date" required /></label>
      <label class="full-field">達成条件<textarea v-model="form.completionCondition" required maxlength="2000" /></label>
      <label class="full-field">測定方法<textarea v-model="form.measurementMethod" required maxlength="2000" /></label>
      <label>計算方式<select v-model="form.calculationType"><option value="numeric">数値</option><option value="milestone">マイルストーン</option><option value="habit">習慣</option><option value="manual">手動</option></select></label>
      <template v-if="form.calculationType === 'numeric'">
        <label>目標値<input v-model.number="form.targetValue" type="number" min="0.01" step="0.01" required /></label>
        <label>現在値<input v-model.number="form.currentValue" type="number" min="0" step="0.01" required /></label>
        <label>単位<input v-model="form.unit" required maxlength="50" /></label>
      </template>
      <label v-else-if="form.calculationType === 'habit'">計画日数<input v-model.number="form.plannedDays" type="number" min="1" step="1" required /></label>
      <template v-else-if="form.calculationType === 'manual'">
        <label>手動進捗率<input v-model.number="form.manualProgress" type="number" min="0" max="100" step="1" required /></label>
        <label class="full-field">判断理由<textarea v-model="form.manualReason" required maxlength="2000" /></label>
      </template>
      <label>優先度<select v-model="form.priority"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
      <label>評価上の重み<input v-model.number="form.weight" type="number" min="0.01" step="0.01" required /></label>
      <label>ステータス<select v-model="form.status"><option value="not_started">未着手</option><option value="in_progress">進行中</option><option value="achieved">達成</option><option value="on_hold">保留</option></select></label>

      <section class="smart-panel full-field" aria-live="polite">
        <div class="smart-heading"><h3>SMART判定</h3><button class="text-button" type="button" @click="checkSmart">判定を更新</button></div>
        <p>警告が残っていても、内容を確認したうえで保存できます。</p>
        <p v-if="!smartWarnings.length" class="smart-complete">SMARTの5観点を満たしています。</p>
        <ul v-else><li v-for="warning in smartWarnings" :key="warning.aspect"><strong>{{ warning.label }}</strong><span>{{ warning.message }}</span></li></ul>
      </section>
      <div><button class="primary-button compact" type="submit">保存</button><button class="text-button" type="button" @click="editing = false">キャンセル</button></div>
    </form>

    <div v-else-if="items.length" class="goal-grid">
      <article v-for="goal in items" :key="goal.id" class="goal-card">
        <span class="status-badge">{{ statusLabel(goal.status) }}</span>
        <h2>{{ goal.name }}</h2>
        <p>{{ goal.category }} / 期限 {{ goal.dueDate.slice(0, 10) }}</p>
        <p v-if="goal.calculationType === 'numeric'">現在 {{ goal.currentValue }} / 目標 {{ goal.targetValue }} {{ goal.unit }}</p>
        <p v-else-if="goal.calculationType === 'habit'">計画 {{ goal.plannedDays }}日</p>
        <p v-else-if="goal.calculationType === 'manual'">進捗 {{ goal.manualProgress }}%</p>
        <p v-else>マイルストーンで測定</p>
        <p v-if="goal.smartWarnings.length" class="smart-count">SMART警告 {{ goal.smartWarnings.length }}件</p>
        <p v-else class="smart-complete">SMART警告なし</p>
        <button class="text-button" type="button" @click="startEdit(goal)">編集</button>
        <button class="text-button danger" type="button" @click="archive(goal)">アーカイブ</button>
      </article>
    </div>

    <section v-else-if="!editing" class="empty-state">
      <h2>目標はまだありません</h2>
      <p>「新規作成」またはロードマップの「目標を作成」から登録してください。</p>
    </section>
  </section>
</template>
