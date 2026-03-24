import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Switch} from "./switch";

const meta = {
  title: "Components/Forms/Switch",
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

export const WithLabel: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
      <Switch id='airplane-mode' />
      <label
        htmlFor='airplane-mode'
        style={{fontSize: "0.875rem", fontWeight: 500, cursor: "pointer"}}>
        Airplane Mode
      </label>
    </div>
  ),
};

export const Small: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
      <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
        <Switch
          id='normal'
          defaultChecked
        />
        <label
          htmlFor='normal'
          style={{fontSize: "0.875rem"}}>
          Normal size
        </label>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
        <Switch
          id='small'
          defaultChecked
          style={{transform: "scale(0.8)", transformOrigin: "left"}}
        />
        <label
          htmlFor='small'
          style={{fontSize: "0.75rem"}}>
          Smaller variant (scaled)
        </label>
      </div>
    </div>
  ),
};
