import type {Preview} from "storybook-react-rsbuild";
import "../src/index.css";
import {darkTheme, lightTheme} from "./theme";

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
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Component theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          {value: "light", title: "☀️ Light", icon: "sun"},
          {value: "dark", title: "🌙 Dark", icon: "moon"},
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals["theme"] ?? "dark";
      const isDark = theme === "dark";

      return (
        <div
          data-theme={isDark ? "dark" : undefined}
          style={{
            padding: "1rem",
            backgroundColor: isDark ? "#09090b" : "#ffffff",
            color: isDark ? "#fafafa" : "#09090b",
            minHeight: "100%",
          }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
