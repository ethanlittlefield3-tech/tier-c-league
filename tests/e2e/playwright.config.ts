import { defineConfig, devices } from '@playwright/test';

// Flow tests: a real browser at iPhone size, tapping through the built app.
// The app is built to talk to the local Firebase emulators, which
// `npm run test:e2e` starts first, so no real database is ever touched.
//   npm run test:e2e
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
  },
  projects: [
    {
      name: 'iPhone size',
      // An iPhone 13's screen, as the Home Screen app sees it: no browser bars.
      use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build -w app -- --mode emulator && npm run preview -w app -- --port 4173 --strictPort',
    cwd: '../..',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
