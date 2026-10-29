import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;
const BANCO = process.env.DATABASE_URL ?? "postgres://nf:nf@localhost:5433/nf";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure", locale: "pt-BR" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    // o build roda antes no CI; localmente o comando builda
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: `http://localhost:${PORTA}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      EXTRACTOR: "fake",
      DATABASE_URL: BANCO,
      LOG_LEVEL: "warn",
      PORT: String(PORTA),
      HOSTNAME: "localhost",
    },
  },
});
