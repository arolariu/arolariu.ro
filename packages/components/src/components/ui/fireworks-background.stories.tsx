import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FireworksBackground} from "./fireworks-background";

const meta = {
  title: "Components/Backgrounds/FireworksBackground",
  component: FireworksBackground,
  tags: ["autodocs"],
  argTypes: {
    population: {
      control: {type: "range", min: 0.1, max: 5, step: 0.1},
      description: "Relative launch frequency multiplier for automatic fireworks",
    },
  },
} satisfies Meta<typeof FireworksBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Auto-launching fireworks with default settings.
 */
export const Default: Story = {
  args: {
    population: 1,
  },
  render: (args) => (
    <div style={{position: "relative", height: "400px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <FireworksBackground {...args} />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Click anywhere!</h2>
      </div>
    </div>
  ),
};

/**
 * High-frequency fireworks display.
 */
export const HighFrequency: Story = {
  args: {
    population: 3,
  },
  render: (args) => (
    <div style={{position: "relative", height: "500px", background: "#1e1b4b", borderRadius: "8px", overflow: "hidden"}}>
      <FireworksBackground {...args} />
      <div style={{position: "relative", zIndex: 10, padding: "3rem", color: "white", textAlign: "center"}}>
        <h1 style={{fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Celebration!</h1>
        <p style={{fontSize: "1.25rem", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Experience more frequent fireworks bursts</p>
      </div>
    </div>
  ),
};

/**
 * Fireworks with custom colors.
 */
export const CustomColors: Story = {
  args: {
    population: 1.5,
    color: ["#ff0080", "#00ff80", "#0080ff", "#ff8000", "#8000ff"],
  },
  render: (args) => (
    <div style={{position: "relative", height: "450px", background: "#000", borderRadius: "8px", overflow: "hidden"}}>
      <FireworksBackground {...args} />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Custom Colors</h2>
      </div>
    </div>
  ),
};
