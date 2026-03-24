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

/**
 * 16:9 aspect ratio wrapping a video placeholder.
 */
export const Video: Story = {
  args: {
    ratio: 16 / 9,
    children: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "20px solid white",
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              marginLeft: "4px",
            }}
          />
        </div>
        <div style={{color: "rgba(255,255,255,0.7)", fontSize: "14px"}}>Video Player (16:9)</div>
      </div>
    ),
  },
};

/**
 * 1:1 square aspect ratio for profile images.
 */
export const Square: Story = {
  args: {
    ratio: 1,
    children: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "8px",
        }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          }}>
          👤
        </div>
        <div style={{color: "white", fontSize: "14px", fontWeight: "600"}}>Profile Image</div>
        <div style={{color: "rgba(255,255,255,0.8)", fontSize: "12px"}}>1:1 Ratio</div>
      </div>
    ),
  },
};
