import type {Preview} from "@storybook/react";

import "../src/app/globals.scss";

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    layout: "fullscreen",
  },
  globalTypes: {
    theme: {
      description: "Theme for components",
      toolbar: {
        title: "Theme",
        icon: "sun",
        items: [
          {value: "light", title: "Light", icon: "sun"},
          {value: "dark", title: "Dark", icon: "moon"},
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
};

export default preview;
