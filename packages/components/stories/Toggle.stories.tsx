import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "../dist";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  StarIcon,
  PinIcon,
  BellIcon,
  CheckIcon,
} from "lucide-react";

const meta: Meta<typeof Toggle> = {
  title: "Design System/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Toggle Component**

A two-state button that can be either 'on' (pressed) or 'off' (unpressed). Useful for representing boolean states or actions like toggling formatting. Built upon the Radix UI Toggle primitive.

**Core Component:**
*   \`<Toggle>\`: The main component, rendering as a \`<button>\` with \`aria-pressed\` state. Manages its pressed state.

**Key Features & Props (from Radix UI & cva):**
*   **Pressed State**: Represents a boolean on/off state, visually indicated by styling changes and managed via the \`pressed\` or \`defaultPressed\` prop.
*   **State Management**: Supports controlled (\`pressed\`, \`onPressedChange\`) and uncontrolled (\`defaultPressed\`) state.
*   **Accessibility**:
    *   Renders as a \`<button>\` element.
    *   Uses \`aria-pressed\` attribute to convey the current state to assistive technologies.
    *   Requires an accessible label, either via its text content or an \`aria-label\` prop, especially if it only contains an icon.
*   **Styling Variants (\`cva\` based):**
    *   \`variant\`: Controls the visual style ('default', 'outline').
    *   \`size\`: Controls padding and font size ('default', 'sm', 'lg').
*   **Disabled State**: Accepts a \`disabled\` prop to make the toggle non-interactive.

See the [shadcn/ui Toggle documentation](https://ui.shadcn.com/docs/components/toggle) and the [Radix UI Toggle documentation](https://www.radix-ui.com/primitives/docs/components/toggle) for more details.
        `,
      },
    },
  },
  argTypes: {
    variant: {
      options: ["default", "outline"],
      control: { type: "select" },
      description: "The visual style of the toggle",
    },
    size: {
      options: ["default", "sm", "lg"],
      control: { type: "select" },
      description: "The size of the toggle",
    },
    defaultPressed: {
      control: "boolean",
      description: "Whether the toggle is initially pressed",
    },
    disabled: {
      control: "boolean",
      description: "Whether the toggle is disabled",
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Toggle>;

// Basic toggle
export const Basic: Story = {
  args: {
    children: "Toggle me",
    "aria-label": "Toggle bold",
    defaultPressed: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A basic Toggle button with text. Clicking it toggles its pressed state.",
      },
    },
  },
};

// Toggle variants
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-2">
        <span className="w-20 text-sm">Default:</span>
        <Toggle aria-label="Toggle bold" defaultPressed>
          <BoldIcon className="size-4" />
          Bold
        </Toggle>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-20 text-sm">Outline:</span>
        <Toggle aria-label="Toggle italic" variant="outline" defaultPressed>
          <ItalicIcon className="size-4" />
          Italic
        </Toggle>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Examples of Toggle buttons with different visual variants.",
      },
    },
  },
};

// Toggle sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-2">
        <span className="w-20 text-sm">Small:</span>
        <Toggle size="sm" aria-label="Toggle small">
          <BoldIcon className="size-3" />
          Small
        </Toggle>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-20 text-sm">Default:</span>
        <Toggle aria-label="Toggle default">
          <BoldIcon className="size-4" />
          Default
        </Toggle>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-20 text-sm">Large:</span>
        <Toggle size="lg" aria-label="Toggle large">
          <BoldIcon className="size-5" />
          Large
        </Toggle>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Examples of Toggle buttons with different sizes.",
      },
    },
  },
};

// Text formatting example
export const TextFormatting: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle aria-label="Toggle bold">
        <BoldIcon className="size-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <ItalicIcon className="size-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <UnderlineIcon className="size-4" />
      </Toggle>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Toggle buttons for text formatting options like bold, italic, and underline.",
      },
    },
  },
};

// Text alignment example
export const TextAlignment: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle aria-label="Align left" defaultPressed>
        <AlignLeftIcon className="size-4" />
      </Toggle>
      <Toggle aria-label="Align center">
        <AlignCenterIcon className="size-4" />
      </Toggle>
      <Toggle aria-label="Align right">
        <AlignRightIcon className="size-4" />
      </Toggle>
      <Toggle aria-label="Align justify">
        <AlignJustifyIcon className="size-4" />
      </Toggle>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Toggle buttons for text alignment options like left, center, right, and justify.",
      },
    },
  },
};

// With disabled state
export const DisabledStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Toggle disabled aria-label="Disabled">
          Disabled
        </Toggle>
        <Toggle disabled defaultPressed aria-label="Disabled pressed">
          Disabled pressed
        </Toggle>
      </div>
      <div className="flex gap-4">
        <Toggle disabled variant="outline" aria-label="Disabled outline">
          Disabled outline
        </Toggle>
        <Toggle
          disabled
          defaultPressed
          variant="outline"
          aria-label="Disabled outline pressed"
        >
          Disabled outline pressed
        </Toggle>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Examples of Toggle buttons in disabled states.",
      },
    },
  },
};

// Toggle with custom styling
export const CustomStyling: Story = {
  render: () => (
    <div className="flex gap-4">
      <Toggle
        className="bg-blue-50 hover:bg-blue-100 data-[state=on]:bg-blue-200 data-[state=on]:text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:data-[state=on]:bg-blue-700 dark:data-[state=on]:text-blue-100"
        aria-label="Toggle favorite"
      >
        <StarIcon className="size-4" />
        Favorite
      </Toggle>

      <Toggle
        className="bg-amber-50 hover:bg-amber-100 data-[state=on]:bg-amber-200 data-[state=on]:text-amber-800 dark:bg-amber-900 dark:hover:bg-amber-800 dark:data-[state=on]:bg-amber-700 dark:data-[state=on]:text-amber-100"
        aria-label="Toggle pin"
      >
        <PinIcon className="size-4" />
        Pin
      </Toggle>

      <Toggle
        className="bg-green-50 hover:bg-green-100 data-[state=on]:bg-green-200 data-[state=on]:text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:data-[state=on]:bg-green-700 dark:data-[state=on]:text-green-100"
        aria-label="Toggle done"
      >
        <CheckIcon className="size-4" />
        Done
      </Toggle>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Examples of Toggle buttons with custom styling for different actions.",
      },
    },
  },
};

// Toggle group example
export const ToggleGroupExample: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-sm text-neutral-500">Notifications</div>
        <div className="flex flex-wrap gap-2">
          <Toggle aria-label="Toggle all notifications">
            <BellIcon className="size-4" />
            All
          </Toggle>
          <Toggle aria-label="Toggle mentions">@Mentions</Toggle>
          <Toggle aria-label="Toggle comments">Comments</Toggle>
          <Toggle aria-label="Toggle direct messages">Messages</Toggle>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-neutral-500">View options</div>
        <div className="flex flex-wrap gap-2">
          <Toggle
            variant="outline"
            aria-label="Toggle grid view"
            defaultPressed
          >
            Grid
          </Toggle>
          <Toggle variant="outline" aria-label="Toggle list view">
            List
          </Toggle>
          <Toggle variant="outline" aria-label="Toggle compact view">
            Compact
          </Toggle>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Examples of grouped Toggle buttons for notifications and view options.",
      },
    },
  },
};
