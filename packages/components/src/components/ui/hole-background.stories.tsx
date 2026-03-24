import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HoleBackground} from "./hole-background";

const meta = {
  title: "Components/Backgrounds/HoleBackground",
  component: HoleBackground,
  tags: ["autodocs"],
  argTypes: {
    numberOfLines: {
      control: {type: "range", min: 10, max: 100, step: 10},
      description: "Number of radial line groups drawn through the tunnel",
    },
    numberOfDiscs: {
      control: {type: "range", min: 10, max: 100, step: 10},
      description: "Number of animated discs used to build the tunnel depth effect",
    },
  },
} satisfies Meta<typeof HoleBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Vortex-style tunnel animation with default settings.
 */
export const Default: Story = {
  args: {
    strokeColor: "#737373",
    numberOfLines: 50,
    numberOfDiscs: 50,
  },
  render: (args) => (
    <div style={{position: "relative", height: "500px", background: "#000", borderRadius: "8px", overflow: "hidden"}}>
      <HoleBackground {...args} />
    </div>
  ),
};

/**
 * Colored tunnel effect.
 */
export const Colored: Story = {
  args: {
    strokeColor: "#3b82f6",
    numberOfLines: 50,
    numberOfDiscs: 50,
    particleRGBColor: [59, 130, 246],
  },
  render: (args) => (
    <div style={{position: "relative", height: "500px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <HoleBackground {...args}>
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
          <h2 style={{fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 10px rgba(59,130,246,0.5)"}}>Enter the Vortex</h2>
        </div>
      </HoleBackground>
    </div>
  ),
};

/**
 * Dense tunnel with more details.
 */
export const Dense: Story = {
  args: {
    strokeColor: "#8b5cf6",
    numberOfLines: 80,
    numberOfDiscs: 80,
    particleRGBColor: [139, 92, 246],
  },
  render: (args) => (
    <div style={{position: "relative", height: "600px", background: "#1e1b4b", borderRadius: "8px", overflow: "hidden"}}>
      <HoleBackground {...args}>
        <div style={{position: "relative", zIndex: 10, padding: "3rem", color: "white"}}>
          <h1 style={{fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem", textShadow: "0 0 10px rgba(139,92,246,0.5)"}}>
            Deep Space
          </h1>
          <p style={{fontSize: "1.25rem", maxWidth: "600px", textShadow: "0 0 8px rgba(139,92,246,0.5)"}}>
            A more detailed tunnel effect with increased disc and line counts.
          </p>
        </div>
      </HoleBackground>
    </div>
  ),
};
