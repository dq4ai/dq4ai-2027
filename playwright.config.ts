import { defineConfig, devices } from "@playwright/test";

const REAL = "http://localhost:4321/dq4ai-2027/";
const POPULATED = "http://localhost:4322/dq4ai-2027/";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "on-first-retry", ...devices["Desktop Chrome"] },
  projects: [
    { name: "real-content", use: { baseURL: REAL } },
    { name: "populated-content", use: { baseURL: POPULATED } },
  ],
  webServer: [
    { command: "pnpm serve", url: REAL, reuseExistingServer: !process.env.CI },
    { command: "pnpm serve:fixture", url: POPULATED, reuseExistingServer: !process.env.CI },
  ],
});
