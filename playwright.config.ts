import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

function loadEnv(file: string, override = false) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  dotenv.config({ path: p, override });
}

// Load default/local dev env first
loadEnv(".env.local", false);

// Load E2E-specific env second (override if same keys exist)
loadEnv(".env.e2e.local", true);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});