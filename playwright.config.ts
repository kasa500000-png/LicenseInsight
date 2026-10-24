import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3103";
const localChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: "test-results/artifacts",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-results.json" }],
  ],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: localChromium
          ? { executablePath: localChromium, args: ["--no-sandbox"] }
          : {},
      },
    },
  ],
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3103",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      APP_ENV: "test",
      DATA_MODE: "live",
      PUBLIC_SITE_URL: baseURL,
      ADS_ENABLED: "false",
      ANALYTICS_ENABLED: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
