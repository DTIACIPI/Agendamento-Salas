import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    headless: false,
    launchOptions: { slowMo: 600 },
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
