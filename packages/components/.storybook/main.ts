import type {StorybookConfig} from "storybook-react-rsbuild";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|mdx|ts|tsx)"],

  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-links",
    "@storybook/addon-themes",
    "@storybook/addon-essentials",
    "@storybook/addon-storysource",
    "@storybook/addon-interactions",
    "storybook-addon-rslib",
  ],

  framework: {
    name: "storybook-react-rsbuild",
    options: {},
  },

  docs: {
    autodocs: true,
  },

  typescript: {
    check: true,
    checkOptions: {
      enable: true,
      tsCheckerOptions: {
        typescript: {
          configFile: "./tsconfig.json",
        },
      },
    },
    reactDocgen: "react-docgen-typescript",
  },
};
export default config;
