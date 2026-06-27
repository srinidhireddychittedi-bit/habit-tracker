import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/**/__tests__/**',
      ],
    },
    // Each test file gets its own isolated environment
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
