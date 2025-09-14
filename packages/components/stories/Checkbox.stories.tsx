import type {Meta, StoryObj} from "@storybook/react";
import {Checkbox} from "../dist";

const meta: Meta<typeof Checkbox> = {
  title: "Design System/Checkbox",
  component: Checkbox,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Checkbox Component**

A control that allows the user to toggle between checked, unchecked, and optionally indeterminate states. Built upon the Radix UI Checkbox primitive, ensuring accessibility and robust state management.

**Core Component:**
*   \`<Checkbox>\`: The main component representing the checkbox input. It wraps the Radix \`Checkbox.Root\` and includes a \`Checkbox.Indicator\` internally.

**Key Features & Props (from Radix UI):**
*   **States**: Supports \`checked\` (boolean or 'indeterminate'), \`defaultChecked\` (boolean, uncontrolled), and \`disabled\` (boolean) props.
*   **Value**: Includes a \`value\` prop, typically used when the checkbox is part of a form submission.
*   **Event Handling**: Provides an \`onCheckedChange\` callback function that receives the new checked state (boolean or 'indeterminate') when the user interacts with the checkbox.
*   **Accessibility**: Automatically handles ARIA attributes (\`role="checkbox"\`, \`aria-checked\`, \`aria-disabled\`) and keyboard navigation (Space key toggles). It's crucial to associate it with a \`<label>\` using \`htmlFor\` and matching \`id\` for full accessibility.
*   **Indeterminate State**: Can represent a state where a group of sub-options is partially selected by setting \`checked="indeterminate"\`.
*   **Styling**: Styled using Tailwind CSS, with variants for different states (checked, unchecked, disabled, focus). The checkmark icon is typically rendered within the Radix \`Checkbox.Indicator\`.

See the [shadcn/ui Checkbox documentation](https://ui.shadcn.com/docs/components/checkbox) and the [Radix UI Checkbox documentation](https://www.radix-ui.com/primitives/docs/components/checkbox) for more details.
        `,
      },
    },
  },
  argTypes: {
    checked: {
      control: "boolean",
      description: "The controlled checked state of the checkbox.",
    },
    defaultChecked: {
      control: "boolean",
      description: "The initial checked state when uncontrolled.",
    },
    onCheckedChange: {
      action: "checkedChange",
      description: "Event handler called when the checked state changes.",
    },
    disabled: {
      control: "boolean",
      description: "Prevents user interaction with the checkbox.",
      table: {
        defaultValue: {summary: false},
      },
    },
    required: {
      control: "boolean",
      description: "Marks the checkbox as required for form submission.",
      table: {
        defaultValue: {summary: false},
      },
    },
    name: {
      control: "text",
      description: "The name of the checkbox, submitted with form data.",
    },
    value: {
      control: "text",
      description: "The value submitted with form data when the checkbox is checked.",
    },
    // id is usually needed for label association
    id: {
      control: "text",
      description: "Unique identifier, often used with a label's `htmlFor` attribute.",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

// Basic checkbox
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A standard, unchecked checkbox.",
      },
    },
  },
  render: () => <Checkbox id='basic-checkbox' />, // Added id for potential label
};

// Checked checkbox
export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
  parameters: {
    docs: {
      description: {
        story: "A checkbox that is checked by default using `defaultChecked`.",
      },
    },
  },
  render: (args) => (
    <Checkbox
      {...args}
      id='checked-checkbox'
    />
  ), // Added id
};

// Disabled checkbox
export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "A checkbox that is disabled and cannot be interacted with.",
      },
    },
  },
  render: (args) => (
    <Checkbox
      {...args}
      id='disabled-checkbox'
    />
  ), // Added id
};

// Disabled and checked checkbox
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
  parameters: {
    docs: {
      description: {
        story: "A checkbox that is both disabled and checked by default.",
      },
    },
  },
  render: (args) => (
    <Checkbox
      {...args}
      id='disabled-checked-checkbox'
    />
  ), // Added id
};

// With label
export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows the common pattern of associating a checkbox with a label using `id` and `htmlFor` for accessibility.",
      },
    },
  },
  render: () => (
    <div className='flex items-center gap-2'>
      <Checkbox id='terms' />
      <label
        htmlFor='terms'
        className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
        Accept terms and conditions
      </label>
    </div>
  ),
};

// Checkbox group
export const CheckboxGroup: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates grouping multiple related checkboxes together, each with its own label.",
      },
    },
  },
  render: () => (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='email'
          defaultChecked
        />
        <label
          htmlFor='email'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Email notifications
        </label>
      </div>
      <div className='flex items-center gap-2'>
        <Checkbox id='push' />
        <label
          htmlFor='push'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Push notifications
        </label>
      </div>
      <div className='flex items-center gap-2'>
        <Checkbox id='sms' />
        <label
          htmlFor='sms'
          className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          SMS notifications
        </label>
      </div>
    </div>
  ),
};

// Error state checkbox
export const Error: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates how to visually indicate an error state, often by styling the label and adding helper text. Uses `aria-invalid` for accessibility.",
      },
    },
  },
  render: () => (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='error'
          aria-invalid='true'
        />
        <label
          htmlFor='error'
          className='text-sm leading-none font-medium text-red-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Required field
        </label>
      </div>
      <p className='text-xs text-red-500'>This field is required</p>
    </div>
  ),
};
