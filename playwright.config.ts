import { defineConfig, devices } from '@playwright/test';

/**
 * By default the suite runs against a local `vite preview` of `dist/`.
 * Set BASE_URL to run it against a deployed site instead (post-deploy smoke test).
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:4319';
const isRemote = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: isRemote
    ? undefined
    : {
        command: 'pnpm exec vite preview --port 4319 --strictPort',
        url: baseURL,
        reuseExistingServer: false,
      },
});
