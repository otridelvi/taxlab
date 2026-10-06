import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the SIT Supabase project in .env.local.
 *
 *   npx playwright install chromium   # once
 *   npm run test:e2e
 */
// Same port as `npm run dev`, so an already running dev server is reused.
const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/admin/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
