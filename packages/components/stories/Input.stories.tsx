import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Input, Label, Button } from "../dist";

const meta: Meta<typeof Input> = {
  title: "Design System/Input",
  component: Input,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Input Component**

Renders a standard HTML \`<input>\` element with consistent styling applied, suitable for text-based user input in forms.

**Core Component:**
*   \`<Input>\`: A styled wrapper around the native \`<input>\` element.

**Key Features & Props:**
*   **Native Attributes**: Accepts all standard HTML \`<input>\` attributes, including:
    *   \`type\`: ('text', 'password', 'email', 'number', 'search', 'tel', 'url', 'date', etc.) - Determines the input behavior and appearance.
    *   \`placeholder\`: Text displayed when the input is empty.
    *   \`value\`, \`defaultValue\`: For controlled or uncontrolled input state.
    *   \`onChange\`: Callback function triggered when the input value changes.
    *   \`disabled\`: Disables user interaction.
    *   \`required\`, \`minLength\`, \`maxLength\`, \`pattern\`: For form validation.
    *   \`id\`, \`name\`: For form submission and label association.
*   **Styling**: Applies consistent visual styling (padding, border, background, focus ring) using Tailwind CSS utility classes. The specific styles adapt based on the theme (light/dark).
*   **Accessibility**: Relies on the native \`<input>\` element's accessibility. It's crucial to pair it with a \`<Label>\` component using matching \`id\` and \`htmlFor\` attributes for proper screen reader support.

See the [shadcn/ui Input documentation](https://ui.shadcn.com/docs/components/input) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    type: {
      control: "select",
      options: [
        "text",
        "password",
        "email",
        "number",
        "search",
        "tel",
        "url",
        "date",
        "time",
        "datetime-local",
        "month",
        "week",
      ],
      description: "The type attribute of the input element.",
      table: {
        type: { summary: "string" },
        defaultValue: { summary: "text" },
      },
    },
    placeholder: {
      control: "text",
      description: "Placeholder text for the input.",
      table: {
        type: { summary: "string" },
      },
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled.",
      table: {
        type: { summary: "boolean" },
        defaultValue: { summary: "false" },
      },
    },
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the input.",
      table: {
        type: { summary: "string" },
      },
    },
    // Standard input attributes like value, onChange, etc., are also available
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// Basic input
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "The default appearance of the Input component.",
      },
    },
  },
  render: () => (
    <div className="w-80">
      <Input placeholder="Type something..." />
    </div>
  ),
};

// With label
export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Associating an Input component with a Label using \`htmlFor\` and \`id\`.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input id="name" placeholder="Enter your name" />
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates the appearance of a disabled Input component.",
      },
    },
  },
  render: () => (
    <div className="w-80">
      <Input placeholder="Disabled input" disabled />
    </div>
  ),
};

// Input types
export const InputTypes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Showcases various \`type\` attributes available for the Input component (e.g., email, password, number, date, file).",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text">Text</Label>
        <Input id="text" type="text" placeholder="Text input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Email input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Password input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="number">Number</Label>
        <Input id="number" type="number" placeholder="Number input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <Input id="time" type="time" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" type="file" />
      </div>
    </div>
  ),
};

// Input validation states
export const ValidationStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates how to visually represent valid and invalid input states, typically by adding custom border colors or using ARIA attributes like \`aria-invalid\`.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="valid">Valid input</Label>
        <Input
          id="valid"
          className="border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/50"
          value="Valid input"
        />
        <p className="text-xs text-green-500">This input is valid</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invalid">Invalid input</Label>
        <Input id="invalid" aria-invalid="true" value="Invalid input" />
        <p className="text-xs text-red-500">This input is invalid</p>
      </div>
    </div>
  ),
};

// Input with icon
export const WithIcon: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Examples of adding icons inside the Input component, usually for search or email fields, requiring custom positioning and padding.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-4">
      <div className="relative">
        <Input placeholder="Search..." className="pl-9" />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="relative">
        <Input placeholder="Email..." className="pl-9" />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  ),
};

// Input with button
export const WithButton: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Combining an Input component with a Button or other elements, often used for search bars or URL inputs.",
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <div className="flex w-80">
        <Input placeholder="Search..." className="rounded-r-none" />
        <Button className="rounded-l-none">Search</Button>
      </div>

      <div className="flex w-80 shadow-sm">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-100 px-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/30">
          https://
        </span>
        <Input placeholder="example.com" className="rounded-l-none" />
      </div>
    </div>
  ),
};

// Input sizes
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates different size variations of the Input component by applying custom height and text size classes.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sm">Small</Label>
        <Input id="sm" className="h-8 text-xs" placeholder="Small input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="md">Default</Label>
        <Input id="md" placeholder="Default input" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lg">Large</Label>
        <Input id="lg" className="h-11 text-lg" placeholder="Large input" />
      </div>
    </div>
  ),
};

// Input group
export const InputGroup: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Grouping multiple related Input components within a \`<fieldset>\` for better form structure and accessibility.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-4">
      <fieldset className="space-y-4 border rounded-md p-4">
        <legend className="px-2 text-sm font-medium">
          Personal Information
        </legend>

        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" placeholder="John Doe" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-address">Email</Label>
          <Input
            id="email-address"
            type="email"
            placeholder="john.doe@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="New York" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal-code">Postal code</Label>
            <Input id="postal-code" placeholder="10001" />
          </div>
        </div>
      </fieldset>
    </div>
  ),
};

// Input with contextual help
export const WithHelp: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Providing helpful text or hints below the Input component to guide the user.",
      },
    },
  },
  render: () => (
    <div className="w-80 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="Enter username" />
        <p className="text-xs text-muted-foreground">
          Choose a username that is at least 4 characters long.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password-help"
          className="flex items-center justify-between"
        >
          <span>Password</span>
          <span className="text-xs text-muted-foreground font-normal">
            Required
          </span>
        </Label>
        <Input
          id="password-help"
          type="password"
          placeholder="Enter password"
        />
        <p className="text-xs text-muted-foreground">
          Password must contain at least 8 characters, including one uppercase
          letter, one lowercase letter, and one number.
        </p>
      </div>
    </div>
  ),
};

// Interactive form example
export const FormExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A complete form example demonstrating the use of Input components along with Labels and Buttons within a form structure.",
      },
    },
  },
  render: () => (
    <div className="w-96 p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create an account</h2>
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="form-name">Full name</Label>
          <Input id="form-name" placeholder="John Doe" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="form-email">Email</Label>
          <Input
            id="form-email"
            type="email"
            placeholder="john.doe@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="form-password">Password</Label>
          <Input
            id="form-password"
            type="password"
            placeholder="Create a password"
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>

        <div className="pt-2">
          <Button className="w-full">Sign up</Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </div>
  ),
};
