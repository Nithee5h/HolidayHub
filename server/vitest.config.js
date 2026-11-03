import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    // One in-memory MongoDB per worker file; keep files sequential for clarity.
    fileParallelism: false,
    hookTimeout: 60000,
  },
});
