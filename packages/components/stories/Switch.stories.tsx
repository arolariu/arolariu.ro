import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Label, Switch } from "../dist";

const meta: Meta<typeof Switch> = {
  title: "Design System/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Switch Component**

A two-state toggle control that allows users to switch between an 'on' (checked) and 'off' (unchecked) state. Built upon the Radix UI Switch primitive.

**Core Components (from Radix UI):**
*   \`<Switch>\`: The root component, rendering as a \`<button>\` with \`role="switch"\`. Manages the checked state. Accepts props like \`checked\`, \`defaultChecked\`, \`onCheckedChange\`, \`disabled\`, \`required\`, \`name\`, \`value\`.
*   \`<SwitchThumb>\`: (Used internally by shadcn/ui \`<Switch>\`) The visual element (\`<span>\`) that slides or moves to indicate the current state (on/off).

**Key Features & Props (from Radix UI):**
*   **Toggle State**: Represents a boolean on/off state.
*   **State Management**: Supports controlled (\`checked\`, \`onCheckedChange\`) and uncontrolled (\`defaultChecked\`) state.
*   **Accessibility**:
    *   Provides the correct ARIA role (\`role="switch"\`) and state (\`aria-checked\`, \`aria-disabled\`).
    *   Supports keyboard interaction (Space or Enter key toggles the state).
    *   Requires an associated \`<Label>\` (using \`htmlFor\` and matching \`id\`) for screen reader users to understand its purpose.
*   **Form Integration**: Includes \`name\` and \`value\` props for use in forms, and \`required\` for validation.
*   **Styling**: Styled using Tailwind CSS. The position of the thumb and the background color of the root element typically change based on the checked state.

See the [shadcn/ui Switch documentation](https://ui.shadcn.com/docs/components/switch) and the [Radix UI Switch documentation](https://www.radix-ui.com/primitives/docs/components/switch) for more details.
        `,
      },
    },
  },
  tags: ["autodocs"],
  args: {
    disabled: false,
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
    defaultChecked: {
      control: "boolean",
      description: "Whether the switch is checked by default",
    },
    checked: {
      control: "boolean",
      description: "Controlled checked state of the switch",
    },
    onCheckedChange: {
      action: "checked changed",
      description: "Event handler called when the checked state changes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "A basic Switch component in its default (unchecked) state.",
      },
    },
  },
  render: (args) => <Switch {...args} />,
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
  parameters: {
    docs: {
      description: {
        story: "A Switch component that is initially in the checked state.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "A disabled Switch component that cannot be interacted with.",
      },
    },
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A Switch component accompanied by a Label, providing context for the toggle.",
      },
    },
  },
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" {...args} />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An example of a controlled Switch where the checked state is managed by React state.",
      },
    },
  },
  render: function ControlledSwitch() {
    const [checked, setChecked] = React.useState(false);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="controlled-switch"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Label htmlFor="controlled-switch">{checked ? "On" : "Off"}</Label>
        </div>
        <p className="text-sm text-neutral-500">
          The switch is {checked ? "on" : "off"}
        </p>
        <button
          onClick={() => setChecked(!checked)}
          className="w-fit px-4 py-2 bg-neutral-900 text-white rounded-md dark:bg-neutral-50 dark:text-neutral-900"
        >
          Toggle
        </button>
      </div>
    );
  },
};

export const FormExample: Story = {
  render: function FormSwitch() {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          alert(
            `Form submitted! Marketing emails: ${
              formData.get("marketing") ? "Yes" : "No"
            }`,
          );
        }}
        className="w-full max-w-sm space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch id="marketing" name="marketing" defaultChecked />
            <Label htmlFor="marketing">Receive marketing emails</Label>
          </div>
          <p className="text-sm text-neutral-500">
            Get notified about new products, features, and more.
          </p>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-neutral-900 text-white rounded-md dark:bg-neutral-50 dark:text-neutral-900"
        >
          Save preferences
        </button>
      </form>
    );
  },
};
