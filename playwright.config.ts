import { PlaywrightTestConfig, devices } from '@playwright/test';

const opts = {
  // launch headless on CI, in browser locally
  headless: !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS,
  // collectCoverage: !!process.env.PLAYWRIGHT_HEADLESS
};
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const config: PlaywrightTestConfig = {
  testDir: './playwright',
  globalSetup: './playwright/global-setup.ts',
  timeout: 35e3,
  outputDir: './playwright/test-results',
  // 'github' for GitHub Actions CI to generate annotations, plus a concise 'dot'
  // default 'list' when running locally
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    headless: opts.headless,
    channel: process.env.CI ? 'chrome' : undefined,
    video: process.env.CI ? 'off' : 'on',
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  fullyParallel: false,
  retries: process.env.CI ? 3 : 0,
  webServer: {
    command: process.env.CI
      ? `pnpm start -p ${port}`
      : `pnpm exec next dev -p ${port}`,
    reuseExistingServer: Boolean(process.env.TEST_LOCAL === '1'),
    port,
  },
};

export default config;
