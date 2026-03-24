import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {RippleButton} from "./ripple-button";

const meta = {
  title: "Components/Actions/RippleButton",
  component: RippleButton,
  tags: ["autodocs"],
  argTypes: {
    scale: {
      control: "number",
      description: "Final expansion scale applied to each ripple animation",
    },
  },
} satisfies Meta<typeof RippleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Ripple button with default settings.
 */
export const Default: Story = {
  args: {
    children: "Click me",
  },
};

/**
 * Ripple button with custom scale.
 */
export const LargeRipple: Story = {
  args: {
    children: "Large ripple effect",
    scale: 20,
  },
};

/**
 * Multiple ripple buttons with different styles.
 */
export const Variants: Story = {
  render: () => (
    <div style={{display: "flex", gap: "1rem", flexWrap: "wrap"}}>
      <RippleButton style={{padding: "0.75rem 1.5rem", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px"}}>
        Primary
      </RippleButton>
      <RippleButton style={{padding: "0.75rem 1.5rem", background: "#10b981", color: "white", border: "none", borderRadius: "8px"}}>
        Success
      </RippleButton>
      <RippleButton style={{padding: "0.75rem 1.5rem", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px"}}>
        Warning
      </RippleButton>
      <RippleButton style={{padding: "0.75rem 1.5rem", background: "#ef4444", color: "white", border: "none", borderRadius: "8px"}}>
        Danger
      </RippleButton>
    </div>
  ),
};
