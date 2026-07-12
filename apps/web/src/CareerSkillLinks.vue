<script setup lang="ts">
import { onMounted, ref } from 'vue';
const props = defineProps<{ goalId: string }>();
type Skill = { id: string; name: string }; type Gap = { skillId: string; name: string; currentLevel: number; targetLevel: number; gap: number };
const skills = ref<Skill[]>([]); const gaps = ref<Gap[]>([]); const selectedIds = ref<string[]>([]); const message = ref('');
async function load() { const [skillsResponse, gapsResponse] = await Promise.all([fetch('/api/skills'), fetch(`/api/career-goal-skills/${props.goalId}`)]); skills.value = ((await skillsResponse.json()) as { items?: Skill[] }).items ?? []; gaps.value = ((await gapsResponse.json()) as { items?: Gap[] }).items ?? []; selectedIds.value = gaps.value.map(({ skillId }) => skillId); }
async function save() { const response = await fetch(`/api/career-goal-skills/${props.goalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillIds: selectedIds.value }) }); message.value = response.ok ? '関連スキルを保存しました。' : '関連付けを保存できませんでした。'; if (response.ok) await load(); }
onMounted(load);
</script>
<template><section class="skill-links"><h3>必要なスキルとレベル差分</h3><p v-if="!skills.length">関連付けできるスキルはまだありません。</p><label v-for="skill in skills" :key="skill.id"><input v-model="selectedIds" type="checkbox" :value="skill.id" />{{ skill.name }}</label><button v-if="skills.length" class="primary-button compact" @click="save">関連付けを保存</button><p aria-live="polite">{{ message }}</p><table v-if="gaps.length"><thead><tr><th>スキル</th><th>現在</th><th>目標</th><th>差分</th></tr></thead><tbody><tr v-for="gap in gaps" :key="gap.skillId"><td>{{ gap.name }}</td><td>{{ gap.currentLevel }}</td><td>{{ gap.targetLevel }}</td><td>{{ gap.gap }}</td></tr></tbody></table></section></template>
