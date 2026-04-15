import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
    // Increase timeout for tests with async operations
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@pos/db': '/sessions/happy-bold-babbage/mnt/restaurant-pos/packages/db/src/index.ts',
      '@pos/shared': '/sessions/happy-bold-babbage/mnt/restaurant-pos/packages/shared/src/index.ts',
    },
  },
});
