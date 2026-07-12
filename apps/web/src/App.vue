<script setup lang="ts">
import { ref } from 'vue';

const mode = ref<'login' | 'register'>('login');
const name = ref('');
const email = ref('');
const password = ref('');
const message = ref('');
const currentUser = ref<{ name: string; email: string } | null>(null);
const csrfToken = ref('');

async function submit(): Promise<void> {
  message.value = '';
  const response = await fetch(`/api/auth/${mode.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ name: name.value, email: email.value, password: password.value }),
  });
  const body = (await response.json()) as { user?: { name: string; email: string }; csrfToken?: string; message?: string };
  if (!response.ok || !body.user) {
    message.value = body.message ?? '処理に失敗しました。';
    return;
  }
  currentUser.value = body.user;
  csrfToken.value = body.csrfToken ?? '';
  password.value = '';
}

async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken.value }, credentials: 'same-origin' });
  if (!response.ok) {
    message.value = 'ログアウトできませんでした。';
    return;
  }
  currentUser.value = null;
  csrfToken.value = '';
}
</script>

<template>
  <main>
    <h1>Career Growth Manager</h1>
    <section v-if="currentUser">
      <p>{{ currentUser.name }}（{{ currentUser.email }}）としてログイン中です。</p>
      <button type="button" @click="logout">ログアウト</button>
    </section>
    <form v-else @submit.prevent="submit">
      <h2>{{ mode === 'login' ? 'ログイン' : 'ユーザー登録' }}</h2>
      <label v-if="mode === 'register'">氏名<input v-model="name" required maxlength="100" /></label>
      <label>メールアドレス<input v-model="email" type="email" required maxlength="254" /></label>
      <label>パスワード<input v-model="password" type="password" required minlength="8" /></label>
      <p v-if="message" role="alert">{{ message }}</p>
      <button type="submit">{{ mode === 'login' ? 'ログイン' : '登録' }}</button>
      <button type="button" @click="mode = mode === 'login' ? 'register' : 'login'">{{ mode === 'login' ? 'ユーザー登録へ' : 'ログインへ' }}</button>
    </form>
  </main>
</template>
