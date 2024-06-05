/** @format */

import {withThemeByClassName} from "@storybook/addon-themes";
import type {Preview} from "@storybook/react";
import "../src/app/globals.css";

export const decorators = [
  withThemeByClassName({
    themes: {
      light: "light",
      dark: "dark",
    },
    defaultTheme: "light",
  }),
];

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
} satisfies Preview;

export default preview;
