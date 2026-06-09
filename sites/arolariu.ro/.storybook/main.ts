import type {StorybookConfig} from "@storybook/nextjs-vite";
import {mergeConfig} from "vite";
import {getStorybookViteAliases} from "./viteAliases";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes"],
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
    }),
};

export default config;
