import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "../dist";

const meta: Meta<typeof Separator> = {
  title: "Design System/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Separator Component**

Visually or semantically separates content sections. Renders as a horizontal or vertical line. Built upon the Radix UI Separator primitive.

**Core Component:**
*   \`<Separator>\`: The main component, wrapping the Radix \`Separator.Root\`.

**Key Features & Props (from Radix UI):**
*   **Orientation**: Controls the direction of the separator line via the \`orientation\` prop ('horizontal' (default) or 'vertical').
*   **Accessibility (\`decorative\` prop):**
    *   If \`decorative\` is true (default), the separator is purely visual and ignored by screen readers (renders as \`<div>\`).
    *   If \`decorative\` is false, it renders with \`role="separator"\` and provides semantic meaning to assistive technologies. Vertical separators require an explicit \`aria-orientation="vertical"\` when not decorative.
*   **Styling**: Styled using Tailwind CSS. Typically applies a border or background color and height/width depending on the orientation. Horizontal separators often have margins (\`my-*\`) for spacing. Vertical separators require the parent container to have a defined height (e.g., using Flexbox and \`h-*\`).

See the [shadcn/ui Separator documentation](https://ui.shadcn.com/docs/components/separator) and the [Radix UI Separator documentation](https://www.radix-ui.com/primitives/docs/components/separator) for more details.
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: { type: "radio" },
      options: ["horizontal", "vertical"],
      description: "The orientation of the separator",
      defaultValue: "horizontal",
    },
    decorative: {
      control: "boolean",
      description: "Whether the separator is purely decorative",
      defaultValue: true,
    },
    className: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
  args: {
    orientation: "horizontal",
    decorative: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displays a horizontal Separator, typically used to divide sections of content stacked vertically.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Default Separator</h4>
        <p className="text-sm text-neutral-500">Content above the separator.</p>
      </div>
      <Separator className="my-4" {...args} />
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Separated Content</h4>
        <p className="text-sm text-neutral-500">Content below the separator.</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    decorative: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displays a vertical Separator, used to divide content arranged horizontally. Requires a parent container with a defined height.",
      },
    },
  },
  render: (args) => (
    <div className="flex h-16 items-center gap-4 max-w-md">
      <div>
        <h4 className="text-sm font-medium leading-none">Left Content</h4>
        <p className="text-sm text-neutral-500">Left of the separator.</p>
      </div>
      <Separator {...args} className="h-full" />
      <div>
        <h4 className="text-sm font-medium leading-none">Right Content</h4>
        <p className="text-sm text-neutral-500">Right of the separator.</p>
      </div>
    </div>
  ),
};

export const InList: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows a Separator used within a block of text to create a visual break.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <h4 className="text-sm font-medium leading-none">List with Separators</h4>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 1</h4>
        <p className="text-sm text-neutral-500">Item 1 description</p>
      </div>
      <Separator />
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 2</h4>
        <p className="text-sm text-neutral-500">Item 2 description</p>
      </div>
      <Separator />
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 3</h4>
        <p className="text-sm text-neutral-500">Item 3 description</p>
      </div>
    </div>
  ),
};

export const InNavigation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A purely decorative Separator (`orientation='horizontal'` is the default). It provides visual separation without semantic meaning.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <h4 className="text-lg font-medium">Navigation Example</h4>
      <nav className="flex items-center gap-4">
        <a href="#" className="text-sm font-medium">
          Home
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          About
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          Products
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          Contact
        </a>
      </nav>
    </div>
  ),
};

export const InForm: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A purely decorative Separator (`orientation='horizontal'` is the default). It provides visual separation without semantic meaning.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <h4 className="text-lg font-medium">Form with Separators</h4>
      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center">
            <input type="checkbox" id="remember" className="mr-2" />
            <label htmlFor="remember" className="text-sm">
              Remember me
            </label>
          </div>
        </div>

        <Separator />

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-50 dark:text-neutral-900"
        >
          Sign In
        </button>
      </form>
    </div>
  ),
};

export const CustomStyling: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates applying custom styles (e.g., color, thickness) to the Separator using CSS classes.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <h4 className="text-lg font-medium">Custom Styled Separators</h4>

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Default Style</h4>
        <p className="text-sm text-neutral-500">Regular separator appearance</p>
      </div>
      <Separator className="my-4" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Thicker Separator</h4>
        <p className="text-sm text-neutral-500">With increased thickness</p>
      </div>
      <Separator className="my-4 h-[2px]" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Colored Separator</h4>
        <p className="text-sm text-neutral-500">With custom color</p>
      </div>
      <Separator className="my-4 bg-blue-500 dark:bg-blue-400" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Gradient Separator</h4>
        <p className="text-sm text-neutral-500">With gradient background</p>
      </div>
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-neutral-500 to-transparent" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Dashed Separator</h4>
        <p className="text-sm text-neutral-500">With dashed style</p>
      </div>
      <div className="my-4 h-px w-full border-t border-dashed border-neutral-300 dark:border-neutral-700" />
    </div>
  ),
};
