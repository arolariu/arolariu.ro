import {type Preview} from "@storybook/react";

import "../src/app/globals.css";
import {withThemes, withTranslations} from "./utils";

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
  decorators: [withThemes, withTranslations],
  globalTypes: {
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
