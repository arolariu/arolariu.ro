import {storybookTest} from "@storybook/addon-vitest/vitest-plugin";
import {storybookNextJsPlugin} from "@storybook/nextjs-vite/vite-plugin";
import {playwright} from "@vitest/browser-playwright";
import {defineConfig} from "vitest/config";

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: "./.storybook",
    }),
    storybookNextJsPlugin(),
  ],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{browser: "chromium"}],
      api: {
        host: "127.0.0.1",
        port: 6011,
      },
    },
    setupFiles: ["./.storybook/vitest.setup.ts"],
  },
});
