import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // در حالت توسعه محلی، درخواست‌های /api رو به wrangler pages dev (پورت 8788) بفرست
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
