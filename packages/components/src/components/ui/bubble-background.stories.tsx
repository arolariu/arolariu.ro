import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {BubbleBackground} from "./bubble-background";

const meta = {
  title: "Components/Backgrounds/BubbleBackground",
  component: BubbleBackground,
  tags: ["autodocs"],
  argTypes: {
    interactive: {
      control: "boolean",
      description: "Enables mouse-following motion for the interactive bubble layer",
    },
  },
} satisfies Meta<typeof BubbleBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Drifting gradient bubbles with default colors.
 */
export const Default: Story = {
  args: {
    interactive: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "400px", background: "#0f172a", borderRadius: "8px", overflow: "hidden"}}>
      <BubbleBackground {...args} />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Bubble Background</h2>
      </div>
    </div>
  ),
};

/**
 * Interactive bubbles that follow mouse movement.
 */
export const Interactive: Story = {
  args: {
    interactive: true,
  },
  render: (args) => (
    <div style={{position: "relative", height: "500px", background: "#1e1b4b", borderRadius: "8px", overflow: "hidden"}}>
      <BubbleBackground {...args} />
      <div style={{position: "relative", zIndex: 10, padding: "3rem", color: "white"}}>
        <h1 style={{fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem"}}>Move your mouse!</h1>
        <p style={{fontSize: "1.25rem", maxWidth: "600px", lineHeight: "1.75"}}>
          Watch the bubbles follow your cursor as you move around the container.
        </p>
      </div>
    </div>
  ),
};

/**
 * Bubbles with custom color palette.
 */
export const CustomColors: Story = {
  args: {
    interactive: false,
    colors: {
      first: "255,20,147",
      second: "138,43,226",
      third: "0,191,255",
      fourth: "255,105,180",
      fifth: "147,112,219",
      sixth: "255,0,255",
    },
  },
  render: (args) => (
    <div style={{position: "relative", height: "450px", background: "#0f0a1f", borderRadius: "8px", overflow: "hidden"}}>
      <BubbleBackground {...args} />
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
        <h2 style={{fontSize: "2rem", fontWeight: "bold"}}>Custom Colors</h2>
      </div>
    </div>
  ),
};
