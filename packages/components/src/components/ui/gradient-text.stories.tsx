import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientText} from "./gradient-text";

const meta = {
  title: "Components/Typography/GradientText",
  component: GradientText,
  tags: ["autodocs"],
  argTypes: {
    neon: {
      control: "boolean",
      description: "Adds a blurred neon duplicate behind the primary text layer",
    },
  },
} satisfies Meta<typeof GradientText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Animated gradient-filled text with default settings.
 */
export const Default: Story = {
  args: {
    text: "Gradient Text",
    neon: false,
  },
  render: (args) => (
    <div
      style={{
        padding: "3rem",
        background: "#0f172a",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <h1 style={{fontSize: "3rem", fontWeight: "bold"}}>
        <GradientText {...args} />
      </h1>
    </div>
  ),
};

/**
 * Gradient text with neon glow effect.
 */
export const WithNeon: Story = {
  args: {
    text: "Neon Glow",
    neon: true,
  },
  render: (args) => (
    <div
      style={{padding: "3rem", background: "#000", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center"}}>
      <h1 style={{fontSize: "4rem", fontWeight: "bold"}}>
        <GradientText {...args} />
      </h1>
    </div>
  ),
};

/**
 * Gradient text with custom gradient colors.
 */
export const CustomGradient: Story = {
  args: {
    text: "Custom Colors",
    gradient: "linear-gradient(90deg, #ff0080 0%, #ff8c00 25%, #40e0d0 50%, #ff8c00 75%, #ff0080 100%)",
    neon: false,
  },
  render: (args) => (
    <div
      style={{
        padding: "3rem",
        background: "#1e1b4b",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <h1 style={{fontSize: "3rem", fontWeight: "bold"}}>
        <GradientText {...args} />
      </h1>
    </div>
  ),
};
