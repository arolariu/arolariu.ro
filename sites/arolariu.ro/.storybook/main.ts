/** @format */

import type {FrameworkOptions, StorybookConfig} from "@storybook/nextjs";

const storybookConfig: StorybookConfig = {
  framework: {
    name: "@storybook/nextjs",
    options: {} satisfies FrameworkOptions,
  },
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-interactions",
    "@storybook/addon-onboarding",
    "@storybook/addon-essentials",
    "@storybook/addon-themes",
    "@storybook/addon-links",
    "@storybook/addon-a11y",
  ],
  docs: {defaultName: "Documentation"},
  staticDirs: ["../public"],
  features: {
    experimentalRSC: true,
  },
} satisfies StorybookConfig;
export default storybookConfig;
