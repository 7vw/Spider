/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const agentPort = Number(process.env.SPIDER_PORT || 7766);

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  resolve: {
    alias: { '@shared': path.resolve(import.meta.dirname, '../shared') },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${agentPort}` },
    fs: { allow: [path.resolve(import.meta.dirname, '..')] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  test: {
    root: path.resolve(import.meta.dirname),
    include: ['src/**/*.test.ts'],
  },
});
