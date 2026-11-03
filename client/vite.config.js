import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // Bootstrap 5.3 still uses Sass @import/global functions; silence its upstream deprecation noise.
      scss: { quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls', 'if-function'] },
    },
  },
  server: {
    port: 5173,
    // Dev: forward API calls to Express so the browser sees one origin.
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:5050', changeOrigin: true } },
  },
  // `npm run preview` serves the production build with the same API proxy.
  preview: {
    port: 4173,
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:5050', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Full-suite runs are CPU-bound (parallel jsdom + animations); avoid false timeouts.
    testTimeout: 15000,
    css: false,
  },
});
