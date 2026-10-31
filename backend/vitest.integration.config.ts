import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  setupFiles: ['./tests/integration-setup.ts'],
  include: ['tests/**/*.integration.test.ts'],
  testTimeout: 30000,
  hookTimeout: 30000,
  fileParallelism: false,
} });
