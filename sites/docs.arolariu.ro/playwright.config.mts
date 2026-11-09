/** @fileoverview Explicit ESM browser-test configuration for the CommonJS-generated documentation site. */
import {defineConfig} from "@playwright/test";

const channel = process.env["PLAYWRIGHT_CHROMIUM_CHANNEL"];

export default defineConfig({
  testDir: "./tests",
  testMatch: "site-only.spec.ts",
  workers: 1,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:3100",
    ...(channel === undefined ? {} : {channel}),
  },
  webServer: {
    command: "npm run prepare:site && npm run start -- --host 127.0.0.1",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:3100",
    env: {AROLARIU_DOCS_SITE_ONLY: "1"},
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
