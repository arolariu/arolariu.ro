import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientBackground} from "./gradient-background";

const meta = {
  title: "Components/Backgrounds/GradientBackground",
  component: GradientBackground,
  tags: ["autodocs"],
} satisfies Meta<typeof GradientBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Continuously shifting multicolor gradient background.
 */
export const Default: Story = {
  render: () => (
    <div style={{position: "relative", height: "400px", borderRadius: "8px", overflow: "hidden"}}>
      <GradientBackground />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Gradient Background</h2>
      </div>
    </div>
  ),
};

/**
 * Gradient background with faster animation.
 */
export const FastAnimation: Story = {
  render: () => (
    <div style={{position: "relative", height: "400px", borderRadius: "8px", overflow: "hidden"}}>
      <GradientBackground transition={{duration: 5, ease: "easeInOut", repeat: Infinity}} />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Fast Animation</h2>
      </div>
    </div>
  ),
};

/**
 * Gradient background with overlaid content.
 */
export const WithContent: Story = {
  render: () => (
    <div style={{position: "relative", height: "500px", borderRadius: "8px", overflow: "hidden"}}>
      <GradientBackground />
      <div style={{position: "relative", zIndex: 10, padding: "3rem", color: "white"}}>
        <h1 style={{fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem", textShadow: "0 0 10px rgba(0,0,0,0.5)"}}>Welcome</h1>
        <p style={{fontSize: "1.25rem", maxWidth: "600px", lineHeight: "1.75", textShadow: "0 0 8px rgba(0,0,0,0.5)"}}>
          A beautiful animated gradient that continuously shifts colors to create an engaging visual experience.
        </p>
      </div>
    </div>
  ),
};
