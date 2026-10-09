import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Read root credentials only in the Vite server process; never expose a VITE_ key.
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  const headers = env.AGENTGUARD_API_KEY ? { Authorization: `Bearer ${env.AGENTGUARD_API_KEY}` } : undefined;
  return {
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true, headers, rewrite: (path) => path.replace(/^\/api/, '') } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
  },
  };
});
