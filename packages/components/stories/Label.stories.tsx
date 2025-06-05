import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Label,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from "../dist";

const meta: Meta<typeof Label> = {
  title: "Design System/Label",
  component: Label,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Label Component**

Renders an accessible label associated with a form control (like \`<Input>\`, \`<Checkbox>\`, \`<RadioGroup>\`, \`<Select>\`). Built upon the Radix UI Label primitive.

**Core Component:**
*   \`<Label>\`: The main component, which wraps the Radix \`Label.Root\`.

**Key Features & Props (from Radix UI):**
*   **Association (\`htmlFor\` prop):** Crucial for accessibility. The \`htmlFor\` prop should match the \`id\` of the form control it labels. Clicking the label will then focus the associated control.
*   **Native Rendering**: Renders a standard HTML \`<label>\` element.
*   **Styling**: Styled using Tailwind CSS utility classes, consistent with other shadcn/ui components. Supports standard props like \`className\`.
*   **Composition**: Wraps the text content or other elements that constitute the label.

**Accessibility:**
*   Using \`<Label>\` with a correct \`htmlFor\` attribute is essential for screen reader users to understand the purpose of form controls.
*   Radix UI ensures the underlying primitive follows accessibility best practices.

See the [shadcn/ui Label documentation](https://ui.shadcn.com/docs/components/label) and the [Radix UI Label documentation](https://www.radix-ui.com/primitives/docs/components/label) for more details.
        `,
      },
    },
  },
  argTypes: {
    htmlFor: {
      control: "text",
      description: "The ID of the form control the label is associated with.",
      table: {
        type: { summary: "string" },
      },
    },
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the label.",
      table: {
        type: { summary: "string" },
      },
    },
    children: {
      control: "text",
      description: "The content of the label.",
      table: {
        type: { summary: "ReactNode" },
      },
    },
    // Standard HTML attributes like 'id', 'style', etc., are also available
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

// Basic label
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A basic example of the Label component associated with an input field.",
      },
    },
  },
  render: () => (
    <div className="flex items-center space-x-2">
      <Label htmlFor="example" className="">
        Example Label
      </Label>
      <Input id="example" className="" type="text" />
    </div>
  ),
};

// Label with required indicator
export const Required: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates adding a visual indicator for required fields using an asterisk within the Label.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col space-y-2 w-64">
      <Label
        htmlFor="required"
        className="after:content-['*'] after:ml-0.5 after:text-red-500"
      >
        Required Field
      </Label>
      <Input id="required" required className="" type="text" />
    </div>
  ),
};

// Label for checkbox
export const WithCheckbox: Story = {
  parameters: {
    docs: {
      description: {
        story: "Associating a Label with a Checkbox component.",
      },
    },
  },
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" className="" />
      <Label htmlFor="terms" className="">
        Accept terms and conditions
      </Label>
    </div>
  ),
};

// Label for radio group
export const WithRadioGroup: Story = {
  parameters: {
    docs: {
      description: {
        story: "Using Labels with RadioGroupItems within a RadioGroup.",
      },
    },
  },
  render: () => (
    <RadioGroup defaultValue="option-one" className="space-y-2">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" className="" />
        <Label htmlFor="option-one" className="">
          Option One
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" className="" />
        <Label htmlFor="option-two" className="">
          Option Two
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" className="" />
        <Label htmlFor="option-three" className="">
          Option Three
        </Label>
      </div>
    </RadioGroup>
  ),
};

// Label for switch
export const WithSwitch: Story = {
  parameters: {
    docs: {
      description: {
        story: "Associating a Label with a Switch component.",
      },
    },
  },
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" className="" />
      <Label htmlFor="airplane-mode" className="">
        Airplane Mode
      </Label>
    </div>
  ),
};

// Label sizes
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Showing different text sizes for the Label component by applying utility classes.",
      },
    },
  },
  render: () => (
    <div className="space-y-6 w-64">
      <div className="space-y-1">
        <Label htmlFor="small" className="text-xs">
          Small Label
        </Label>
        <Input id="small" placeholder="Small input" className="" type="text" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="medium" className="">
          Medium Label (Default)
        </Label>
        <Input
          id="medium"
          placeholder="Medium input"
          className=""
          type="text"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="large" className="text-lg">
          Large Label
        </Label>
        <Input id="large" placeholder="Large input" className="" type="text" />
      </div>
    </div>
  ),
};

// Disabled label
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how the Label appears when associated with a disabled input field. The label itself doesn't have a disabled state, but its appearance might be styled differently based on the associated input's state in a real application.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col space-y-2 w-64">
      <Label htmlFor="disabled" className="text-muted-foreground">
        Disabled Field
      </Label>
      <Input id="disabled" disabled className="" type="text" />
    </div>
  ),
};

// Label with description
export const WithDescription: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Providing additional descriptive text below the Label to give context to the associated input field.",
      },
    },
  },
  render: () => (
    <div className="space-y-1 w-64">
      <Label htmlFor="with-description" className="">
        Username
      </Label>
      <p className="text-xs text-muted-foreground">
        This will be displayed on your public profile.
      </p>
      <Input id="with-description" className="" type="text" />
    </div>
  ),
};

// Form with multiple labeled inputs
export const FormExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates how to use the Label component within a form structure, associating it with a specific form control using `htmlFor`.",
      },
    },
  },
  render: () => (
    <form className="space-y-6 w-80">
      <div className="space-y-1">
        <Label htmlFor="name" className="">
          Full Name
        </Label>
        <Input id="name" placeholder="John Doe" className="" type="text" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email" className="">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          className=""
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password" className="">
          Password
        </Label>
        <Input id="password" type="password" className="" />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters.
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" className="" />
        <Label htmlFor="remember" className="">
          Remember me
        </Label>
      </div>
    </form>
  ),
};
