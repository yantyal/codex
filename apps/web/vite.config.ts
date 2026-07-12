import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    // 開発中のAPIリクエストをExpressへ転送する。
    proxy: { '/api': 'http://localhost:3001' },
  },
});
