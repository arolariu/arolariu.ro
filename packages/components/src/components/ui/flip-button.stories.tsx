import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FlipButton} from "./flip-button";

const meta = {
  title: "Components/Actions/FlipButton",
  component: FlipButton,
  tags: ["autodocs"],
  argTypes: {
    from: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
      description: "Direction from which the back face flips into view",
    },
  },
} satisfies Meta<typeof FlipButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Flip button with default top flip direction.
 */
export const Default: Story = {
  args: {
    frontText: "Hover me",
    backText: "Click now!",
    from: "top",
  },
};

/**
 * Flip button that flips from the bottom.
 */
export const FlipFromBottom: Story = {
  args: {
    frontText: "Learn more",
    backText: "Get started",
    from: "bottom",
  },
};

/**
 * Flip button that flips from the left side.
 */
export const FlipFromLeft: Story = {
  args: {
    frontText: "Products",
    backText: "View all",
    from: "left",
  },
};

/**
 * Flip button with custom styling.
 */
export const CustomStyling: Story = {
  args: {
    frontText: "Subscribe",
    backText: "Join now!",
    from: "top",
    style: {
      padding: "1rem 2rem",
      fontSize: "1.125rem",
      borderRadius: "12px",
    },
  },
};
