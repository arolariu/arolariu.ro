import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {BackgroundBeams} from "./background-beams";

const meta = {
  title: "Components/Backgrounds/BackgroundBeams",
  component: BackgroundBeams,
  tags: ["autodocs"],
} satisfies Meta<typeof BackgroundBeams>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Animated aurora-style beams sweeping across the background.
 */
export const Default: Story = {
  render: () => (
    <div style={{position: "relative", height: "400px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <BackgroundBeams />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Background Beams</h2>
      </div>
    </div>
  ),
};

/**
 * Beams with overlaid content.
 */
export const WithContent: Story = {
  render: () => (
    <div style={{position: "relative", height: "500px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <BackgroundBeams />
      <div style={{position: "relative", zIndex: 10, padding: "3rem", color: "white"}}>
        <h1 style={{fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem"}}>Welcome</h1>
        <p style={{fontSize: "1.25rem", maxWidth: "600px", lineHeight: "1.75"}}>
          Experience the power of animated aurora-style beams that add depth and motion to your designs.
        </p>
      </div>
    </div>
  ),
};

/**
 * Full-screen background beams.
 */
export const FullScreen: Story = {
  render: () => (
    <div style={{position: "relative", height: "100vh", width: "100vw", background: "#1e1b4b", overflow: "hidden"}}>
      <BackgroundBeams />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "white",
          textAlign: "center",
        }}>
        <h1 style={{fontSize: "4rem", fontWeight: "bold", marginBottom: "1rem"}}>Full Screen Beams</h1>
        <p style={{fontSize: "1.5rem", maxWidth: "800px"}}>A stunning visual effect for hero sections and landing pages.</p>
      </div>
    </div>
  ),
};
