/** @format */

import type {StorybookConfig} from "@storybook/nextjs";

const storybookConfig: StorybookConfig = {
  framework: "@storybook/nextjs",
  stories: ["../stories/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-onboarding",
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
