import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Scratcher} from "./scratcher";

const meta = {
  title: "Components/Interactions/Scratcher",
  component: Scratcher,
  tags: ["autodocs"],
  argTypes: {
    width: {
      control: "number",
      description: "Width of the scratch card surface in pixels",
    },
    height: {
      control: "number",
      description: "Height of the scratch card surface in pixels",
    },
    minScratchPercentage: {
      control: {type: "range", min: 10, max: 90, step: 5},
      description: "Percentage of cleared pixels required before completion fires",
    },
  },
} satisfies Meta<typeof Scratcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Scratch card with default settings revealing hidden content.
 */
export const Default: Story = {
  args: {
    width: 320,
    height: 180,
    minScratchPercentage: 50,
    onComplete: () => console.log("Scratch complete!"),
  },
  render: (args) => (
    <div style={{display: "flex", justifyContent: "center", padding: "2rem"}}>
      <Scratcher {...args}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontSize: "1.5rem",
            fontWeight: "bold",
            borderRadius: "8px",
          }}>
          🎉 You won!
        </div>
      </Scratcher>
    </div>
  ),
};

/**
 * Scratch card with custom gradient colors.
 */
export const CustomGradient: Story = {
  args: {
    width: 300,
    height: 200,
    minScratchPercentage: 50,
    gradientColors: ["#ff0080", "#ff8c00", "#40e0d0"],
  },
  render: (args) => (
    <div style={{display: "flex", justifyContent: "center", padding: "2rem"}}>
      <Scratcher {...args}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#1e293b",
            color: "white",
            padding: "1rem",
            borderRadius: "8px",
          }}>
          <div style={{fontSize: "2rem", marginBottom: "0.5rem"}}>🎁</div>
          <div style={{fontSize: "1.25rem", fontWeight: "bold"}}>$50 OFF</div>
          <div style={{fontSize: "0.875rem", opacity: 0.8}}>Your next purchase</div>
        </div>
      </Scratcher>
    </div>
  ),
};

/**
 * Large scratch card with lower completion threshold.
 */
export const Large: Story = {
  args: {
    width: 400,
    height: 250,
    minScratchPercentage: 30,
  },
  render: (args) => (
    <div style={{display: "flex", justifyContent: "center", padding: "2rem"}}>
      <Scratcher {...args}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white",
            padding: "2rem",
            borderRadius: "8px",
            textAlign: "center",
          }}>
          <div style={{fontSize: "3rem", marginBottom: "0.5rem"}}>🏆</div>
          <div style={{fontSize: "1.75rem", fontWeight: "bold", marginBottom: "0.25rem"}}>Congratulations!</div>
          <div style={{fontSize: "1rem"}}>You've unlocked a special prize</div>
        </div>
      </Scratcher>
    </div>
  ),
};
