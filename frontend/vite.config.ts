import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const data = env.PREVIEW_DATA_URL ? new URL(env.PREVIEW_DATA_URL) : null;
  const proxy = {
    ...(data && { '/api/sub-regioes': {
      target: data.origin,
      changeOrigin: true,
      rewrite: (path: string) => data.pathname + (path.includes('?') ? '?' + path.split('?')[1] : ''),
    } }),
    '/api': env.PREVIEW_FLASK_URL || 'http://127.0.0.1:5000',
  };
  return { base: './', plugins: [react()], server: { proxy }, preview: { proxy } };
});
