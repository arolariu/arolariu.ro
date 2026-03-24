import {withThemeByDataAttribute} from "@storybook/addon-themes";
import type {Preview} from "storybook-react-rsbuild";
import "../src/index.css";
import {darkTheme} from "./theme";

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
      theme: darkTheme,
    },
    a11y: {
      config: {
        rules: [
          {id: "color-contrast", enabled: true},
          {id: "aria-required-attr", enabled: true},
          {id: "button-name", enabled: true},
          {id: "image-alt", enabled: true},
        ],
      },
    },
    viewport: {
      viewports: {
        mobile: {name: "Mobile", styles: {width: "375px", height: "812px"}},
        tablet: {name: "Tablet", styles: {width: "768px", height: "1024px"}},
        desktop: {name: "Desktop", styles: {width: "1280px", height: "800px"}},
      },
    },
    options: {
      storySort: {
        order: [
          "Introduction",
          ["Welcome", "Getting Started", "Design Principles"],
          "Foundations",
          ["Design Tokens", "Typography", "Motion", "Component Sizes"],
          "Components",
          [
            "Actions",
            "Forms",
            "Data Display",
            "Feedback",
            "Navigation",
            "Overlays",
            "Layout",
            "Typography",
            "Backgrounds",
            "Utilities",
            "Interactions",
          ],
        ],
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "dark",
      attributeName: "data-theme",
    }),
    (Story) => (
      <div style={{padding: "1rem"}}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
