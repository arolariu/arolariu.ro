import {resolve} from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";

import baseConfig from "../../scripts/vitest.config.ts";

export default mergeConfig(
  baseConfig,
  defineConfig({
    root: resolve(import.meta.dirname),
    test: {
      include: ["src/lib/**/*.test.ts", "scripts/**/*.test.ts"],
      coverage: {
        include: ["src/lib/siteMode.ts", "src/lib/navigation.ts", "scripts/prepare-site.mts"],
      },
    },
  }),
);
