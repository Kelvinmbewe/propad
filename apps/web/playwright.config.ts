import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000/api/mock'
    }
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  }
});
