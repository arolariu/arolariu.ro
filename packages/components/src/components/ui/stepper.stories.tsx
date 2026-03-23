import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Stepper} from "./stepper";

const meta = {
  component: Stepper,
  tags: ["autodocs"],
  argTypes: {
    activeStep: {
      control: {type: "number", min: 0, max: 3},
      description: "Current active step (0-indexed)",
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout orientation",
    },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalFirstStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 0,
    orientation: "horizontal",
  },
};

export const HorizontalSecondStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 1,
    orientation: "horizontal",
  },
};

export const HorizontalLastStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 3,
    orientation: "horizontal",
  },
};

export const VerticalFirstStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 0,
    orientation: "vertical",
  },
};

export const VerticalSecondStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 1,
    orientation: "vertical",
  },
};
