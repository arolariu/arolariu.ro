import type {StorybookConfig} from "storybook-react-rsbuild";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-links", "storybook-addon-rslib"],
  framework: "storybook-react-rsbuild",
  docs: {
    autodocs: "tag",
  },
};

export default config;
