import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {DotBackground} from "./dot-background";

const meta = {
  title: "Components/Backgrounds/DotBackground",
  component: DotBackground,
  tags: ["autodocs"],
  argTypes: {
    glow: {
      control: "boolean",
      description: "Enables pulsing radial glow animation for every dot",
    },
  },
} satisfies Meta<typeof DotBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Static dot grid background.
 */
export const Default: Story = {
  args: {
    glow: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "400px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <DotBackground
        {...args}
        style={{color: "#3b82f6"}}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "white",
        }}>
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Dot Background</h2>
      </div>
    </div>
  ),
};

/**
 * Animated glowing dot grid.
 */
export const Glowing: Story = {
  args: {
    glow: true,
  },
  render: (args) => (
    <div style={{position: "relative", height: "400px", background: "#1e1b4b", borderRadius: "8px", overflow: "hidden"}}>
      <DotBackground
        {...args}
        style={{color: "#8b5cf6"}}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "white",
        }}>
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Glowing Dots</h2>
      </div>
    </div>
  ),
};

/**
 * Dense dot pattern with custom spacing.
 */
export const Dense: Story = {
  args: {
    width: 10,
    height: 10,
    glow: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "400px", background: "#111827", borderRadius: "8px", overflow: "hidden"}}>
      <DotBackground
        {...args}
        style={{color: "#10b981"}}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "white",
        }}>
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Dense Pattern</h2>
      </div>
    </div>
  ),
};
