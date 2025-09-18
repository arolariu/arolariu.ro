import type {StorybookConfig} from "@storybook/nextjs";

const storybookConfig: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],

  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-onboarding",
    "@storybook/addon-coverage",
    "@storybook/addon-themes",
    "@storybook/addon-links",
    "@storybook/addon-a11y",
  ],

  framework: {
    name: "@storybook/nextjs",
    options: {},
  },

  docs: {defaultName: "Documentation"},

  staticDirs: ["../public"],

  features: {
    experimentalRSC: true,
  },
} satisfies StorybookConfig;

export default storybookConfig;
