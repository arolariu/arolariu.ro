import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {AspectRatio} from "./aspect-ratio";

const meta = {
  title: "Components/Layout/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  argTypes: {
    ratio: {
      control: "text",
      description: "Aspect ratio applied to the wrapper element",
    },
  },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default 1:1 square aspect ratio.
 */
export const Default: Story = {
  args: {
    ratio: 1,
    children: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(to bottom right, #3b82f6, #8b5cf6)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}>
        1:1 Ratio
      </div>
    ),
  },
};

/**
 * Widescreen 16:9 aspect ratio commonly used for video content.
 */
export const Widescreen: Story = {
  args: {
    ratio: 16 / 9,
    children: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(to bottom right, #ec4899, #f43f5e)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}>
        16:9 Widescreen
      </div>
    ),
  },
};

/**
 * Classic 4:3 aspect ratio used for standard displays.
 */
export const Standard: Story = {
  args: {
    ratio: 4 / 3,
    children: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(to bottom right, #10b981, #06b6d4)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}>
        4:3 Standard
      </div>
    ),
  },
};
