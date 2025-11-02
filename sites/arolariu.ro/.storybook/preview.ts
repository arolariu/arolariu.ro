import {type Preview} from "@storybook/react";

import "../src/app/globals.css";
import {withTheme, withThemes, withTranslations} from "./decorators";

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
  decorators: [withThemes, withTheme, withTranslations],
  globalTypes: {
    // Theme toggler
    theme: {
      name: "Theme",
      description: "Global theme for components",
      toolbar: {
        icon: "circlehollow",
        items: [
          {
            value: "light",
            icon: "circlehollow",
            title: "Light",
          },
          {
            value: "dark",
            icon: "circle",
            title: "Dark",
          },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },

    // Localization toggler
    locale: {
      name: "Locale",
      description: "Internationalization locale",
      toolbar: {
        icon: "globe",
        items: [
          {value: "en", title: "English"},
          {value: "ro", title: "Romanian"},
        ],
        showName: true,
      },
    },
  },
} satisfies Preview;

export default preview;
