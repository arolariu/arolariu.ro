import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Switch} from "./switch";

const meta = {
  component: Switch,
  tags: ["autodocs"],
  argTypes: {
    defaultChecked: {
      control: "boolean",
      description: "Initial checked state (uncontrolled)",
    },
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: {
    defaultChecked: false,
  },
};

export const On: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    defaultChecked: false,
    disabled: true,
  },
};

export const OnDisabled: Story = {
  args: {
    defaultChecked: true,
    disabled: true,
  },
};
