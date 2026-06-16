import type {StorybookConfig} from "@storybook/nextjs-vite";
import {mergeConfig} from "vite";

import {getStorybookResolverPlugins, getStorybookViteAliases} from "./domainAliases.js";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes", "@storybook/addon-vitest"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  features: {
    experimentalRSC: true,
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: getStorybookViteAliases(),
      },
      plugins: getStorybookResolverPlugins(),
      optimizeDeps: {
        include: [
          "motion",
          "motion/react",
          "next-intl",
          "next-intl-selector",
          "@arolariu/components",
          "recharts",
          "three",
          "react-icons/tb",
        ],
      },
      server: {
        warmup: {
          // Order matters: front-load the shared infra barrel and the heaviest
          // invoice stories so they are transformed first, then warm the rest of
          // the invoice domain. Warmup is non-blocking, so "Storybook ready" is
          // unaffected. A `*` (not `[id]`) is used for dynamic-route segments
          // because warmup paths are globbed and `[id]` reads as a char class.
          clientFiles: [
            "./.storybook/preview.tsx",
            "./src/app/domains/invoices/_storybook/index.ts",
            "./src/app/domains/invoices/view-invoices/_components/tables/GridView.stories.tsx",
            "./src/app/domains/invoices/view-invoice/*/_components/cards/ItemAnalyticsCard.stories.tsx",
            "./src/app/_effects/TechSphere.stories.tsx",
            "./src/app/domains/invoices/**/*.stories.tsx",
          ],
        },
      },
    }),
};

export default config;
