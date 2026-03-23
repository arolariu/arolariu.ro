import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Progress} from "./progress";

const meta = {
  component: Progress,
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: {type: "range", min: 0, max: 100, step: 1},
      description: "Completion percentage (0-100)",
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = {
  args: {
    value: 0,
  },
};

export const TwentyFive: Story = {
  args: {
    value: 25,
  },
};

export const Fifty: Story = {
  args: {
    value: 50,
  },
};

export const SeventyFive: Story = {
  args: {
    value: 75,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
};
