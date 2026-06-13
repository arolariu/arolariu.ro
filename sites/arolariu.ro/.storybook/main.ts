import type {StorybookConfig} from "@storybook/nextjs-vite";
import {mergeConfig} from "vite";

import {getStorybookResolverPlugins, getStorybookViteAliases} from "./domainAliases.js";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    docsMode: true,
  },
  features: {
    experimentalRSC: true,
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: getStorybookViteAliases(),
      },
      plugins: getStorybookResolverPlugins(),
    }),
};

export default config;
