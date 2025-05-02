import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../dist";

const meta: Meta<typeof Badge> = {
  title: "Design System/Badge",
  component: Badge,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Badge Component**

Displays a small, inline element typically used for labeling, categorization, or status indicators. Based on a simple div element with variants controlled by \`cva\`.

**Core Component:**
*   \`<Badge>\`: The single component representing the badge. It accepts a \`variant\` prop ('default', 'secondary', 'destructive', 'outline') to control visual styling.

**Key Features:**
*   Provides several pre-defined visual styles through the \`variant\` prop.
*   Easily customizable with standard CSS classes for colors, padding, borders, etc.
*   Can contain text, icons, or other simple inline content.
*   Uses Tailwind CSS utility classes for styling by default.

See the [shadcn/ui Badge documentation](https://ui.shadcn.com/docs/components/badge) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    variant: {
      options: ["default", "secondary", "destructive", "outline"],
      control: { type: "select" },
      description: "The visual style of the badge.",
      table: {
        defaultValue: { summary: "default" },
      },
    },
    // Children are implicitly handled
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

// Default badge
export const Default: Story = {
  args: {
    variant: "default",
    children: "Default",
  },
  parameters: {
    docs: {
      description: {
        story: "The standard badge style.",
      },
    },
  },
};

// Secondary badge
export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A secondary badge style, often used for less prominent information.",
      },
    },
  },
};

// Destructive badge
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A badge style used to indicate errors, warnings, or negative status.",
      },
    },
  },
};

// Outline badge
export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
  parameters: {
    docs: {
      description: {
        story: "An outlined badge style, providing a lighter visual weight.",
      },
    },
  },
};

// With icon
export const WithIcon: Story = {
  parameters: {
    docs: {
      description: {
        story: "Badges can include icons alongside text content.",
      },
    },
  },
  render: () => (
    <div className="flex gap-4">
      <Badge>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
          <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M12 2v2" />
          <path d="M12 22v-2" />
          <path d="m17 20.66-1-1.73" />
          <path d="M11 10.27 7 3.34" />
          <path d="m20.66 17-1.73-1" />
          <path d="m3.34 7 1.73 1" />
          <path d="M14 12h8" />
          <path d="M2 12h2" />
          <path d="m20.66 7-1.73 1" />
          <path d="m3.34 17 1.73-1" />
          <path d="m17 3.34-1 1.73" />
          <path d="m7 20.66-1-1.73" />
        </svg>
        Active
      </Badge>
      <Badge variant="secondary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        Status
      </Badge>
    </div>
  ),
};

// Custom styled badges
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates applying custom background, hover, and border colors using CSS classes.",
      },
    },
  },
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Badge className="bg-blue-500 hover:bg-blue-600 border-blue-500">
        Blue
      </Badge>
      <Badge className="bg-green-500 hover:bg-green-600 border-green-500">
        Green
      </Badge>
      <Badge className="bg-amber-500 hover:bg-amber-600 border-amber-500">
        Amber
      </Badge>
      <Badge className="bg-purple-500 hover:bg-purple-600 border-purple-500">
        Purple
      </Badge>
    </div>
  ),
};
