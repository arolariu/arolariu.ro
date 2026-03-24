import type {StorybookConfig} from "storybook-react-rsbuild";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-links", "storybook-addon-rslib"],
  framework: "storybook-react-rsbuild",
  staticDirs: ["./static"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
