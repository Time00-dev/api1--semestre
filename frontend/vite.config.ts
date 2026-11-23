import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function publicUrl(value: string | undefined, endpoint: string) {
  if (!value?.trim()) return '';
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith(endpoint)) {
    throw new Error('Configure a URL pública HTTPS de ' + endpoint + ' sem credenciais nem parâmetros.');
  }
  return url.href;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const dataUrl = publicUrl(env.VITE_DATA_URL, '/api/sub-regioes');
  const analysisUrl = publicUrl(env.VITE_ANALYSIS_URL, '/api/analise');
  const connect = [...new Set([dataUrl, analysisUrl].filter(Boolean).map(value => new URL(value).origin))];
  const previewData = env.PREVIEW_DATA_URL ? new URL(env.PREVIEW_DATA_URL) : null;
  const proxy = {
    ...(previewData && { '/api/sub-regioes': {
      target: previewData.origin,
      changeOrigin: true,
      rewrite: (path: string) => previewData.pathname + (path.includes('?') ? '?' + path.split('?')[1] : ''),
    } }),
    '/api': env.PREVIEW_FLASK_URL || 'http://127.0.0.1:5000',
  };
  return {
    base: './',
    envPrefix: [],
    define: {
      'import.meta.env.VITE_DATA_URL': JSON.stringify(dataUrl),
      'import.meta.env.VITE_ANALYSIS_URL': JSON.stringify(analysisUrl),
    },
    build: { rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'react-runtime', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
    ] } } } },
    plugins: [
      react(),
      {
        name: 'pages-content-security-policy',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler() {
            const policy = [
              "default-src 'none'", "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self'",
              ["connect-src", "'self'", ...connect].join(' '),
              "base-uri 'none'", "object-src 'none'", "form-action 'none'",
            ].join('; ');
            return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }];
          },
        },
      },
    ],
    server: { proxy },
    preview: { proxy },
  };
});
