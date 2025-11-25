import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/tests/e2e/**', '**/node_modules/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@propad/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@propad/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
      '@propad/config': path.resolve(__dirname, '../../packages/config/src')
    }
  }
});
