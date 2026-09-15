import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// El proceso de Playwright es Node puro, no Next.js — no carga .env.local
// automáticamente como sí hace `next dev`. Los tests necesitan
// ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD/ADMIN_BOOTSTRAP_SECRET para
// loguearse (ver e2e/helpers/login.ts), así que se cargan acá explícito —
// mismo mecanismo que ya usa prisma.config.ts.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
