import type {Preview} from "storybook-react-rsbuild";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
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
  },
  decorators: [
    (Story) => (
      <div style={{padding: "1rem"}}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
