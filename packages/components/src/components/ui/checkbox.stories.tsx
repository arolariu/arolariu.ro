import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Checkbox} from "./checkbox";

const meta = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "select",
      options: [true, false, "indeterminate"],
      description: "The checked state",
    },
    disabled: {
      control: "boolean",
      description: "Whether the checkbox is disabled",
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    checked: "indeterminate",
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const CheckedDisabled: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
      <Checkbox
        id="terms"
        defaultChecked={false}
      />
      <label
        htmlFor="terms"
        style={{fontSize: "0.875rem", fontWeight: 500, cursor: "pointer"}}>
        Accept terms and conditions
      </label>
    </div>
  ),
};

export const IndeterminateState: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <Checkbox
          id="all"
          checked="indeterminate"
        />
        <label
          htmlFor="all"
          style={{fontSize: "0.875rem", fontWeight: 600}}>
          Select All
        </label>
      </div>
      <div style={{paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Checkbox
            id="item1"
            defaultChecked
          />
          <label
            htmlFor="item1"
            style={{fontSize: "0.875rem"}}>
            Item 1 (checked)
          </label>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Checkbox
            id="item2"
            defaultChecked={false}
          />
          <label
            htmlFor="item2"
            style={{fontSize: "0.875rem"}}>
            Item 2 (unchecked)
          </label>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Checkbox
            id="item3"
            defaultChecked
          />
          <label
            htmlFor="item3"
            style={{fontSize: "0.875rem"}}>
            Item 3 (checked)
          </label>
        </div>
      </div>
    </div>
  ),
};
