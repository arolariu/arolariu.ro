import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AspectRatio } from "../dist";

const meta: Meta<typeof AspectRatio> = {
  title: "Design System/Aspect Ratio",
  component: AspectRatio,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Aspect Ratio Component**

A container component that maintains a specific aspect ratio for its child element(s), regardless of the container's width. Built upon the Radix UI Aspect Ratio primitive.

**Core Component:**
*   \`<AspectRatio>\`: The single component that wraps the content. It requires a \`ratio\` prop.

**Key Features:**
*   Accepts a \`ratio\` prop (number), calculated as \`width / height\`. For example, \`16 / 9\` for landscape, \`1 / 1\` for square, \`3 / 4\` for portrait.
*   Automatically calculates the required padding or dimensions to enforce the specified ratio.
*   Ideal for embedding images, videos, iframes, or any content that needs consistent proportions.
*   The child element should typically be styled to fill the \`<AspectRatio>\` container (e.g., using \`width: 100%\`, \`height: 100%\`, \`object-fit: cover\`).

See the [shadcn/ui Aspect Ratio documentation](https://ui.shadcn.com/docs/components/aspect-ratio) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    ratio: {
      control: "number",
      description: "The desired aspect ratio (width / height).",
      table: {
        defaultValue: { summary: "1 / 1" }, // Default might vary based on implementation
      },
    },
    // Children are implicitly handled
  },
};

export default meta;

type Story = StoryObj<typeof AspectRatio>;

// Square (1:1)
export const Square: Story = {
  args: {
    ratio: 1 / 1,
  },
  parameters: {
    docs: {
      description: {
        story: "Displays content with a 1:1 (square) aspect ratio.",
      },
    },
  },
  render: (args) => (
    <div className="w-[300px]">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Standard landscape (16:9)
export const Landscape: Story = {
  args: {
    ratio: 16 / 9,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displays content with a 16:9 (standard landscape) aspect ratio.",
      },
    },
  },
  render: (args) => (
    <div className="w-[300px]">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Portrait (3:4)
export const Portrait: Story = {
  args: {
    ratio: 3 / 4,
  },
  parameters: {
    docs: {
      description: {
        story: "Displays content with a 3:4 (portrait) aspect ratio.",
      },
    },
  },
  render: (args) => (
    <div className="w-[200px]">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Ultrawide (21:9)
export const Ultrawide: Story = {
  args: {
    ratio: 21 / 9,
  },
  parameters: {
    docs: {
      description: {
        story: "Displays content with a 21:9 (ultrawide) aspect ratio.",
      },
    },
  },
  render: (args) => (
    <div className="w-[400px]">
      <AspectRatio {...args}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// With content other than image
export const WithContent: Story = {
  args: {
    ratio: 16 / 9,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates using AspectRatio with non-image content, like a styled div.",
      },
    },
  },
  render: (args) => (
    <div className="w-[300px]">
      <AspectRatio {...args}>
        <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
          <p className="text-sm font-medium">16:9 Aspect Ratio</p>
        </div>
      </AspectRatio>
    </div>
  ),
};

// Multiple aspect ratios comparison
export const Comparison: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compares the visual output of several common aspect ratios side-by-side.",
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">Square (1:1)</p>
        <div className="w-full max-w-[200px]">
          <AspectRatio ratio={1 / 1}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">1:1</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Landscape (16:9)</p>
        <div className="w-full max-w-[200px]">
          <AspectRatio ratio={16 / 9}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">16:9</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Portrait (3:4)</p>
        <div className="w-full max-w-[150px]">
          <AspectRatio ratio={3 / 4}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">3:4</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Ultrawide (21:9)</p>
        <div className="w-full max-w-[300px]">
          <AspectRatio ratio={21 / 9}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">21:9</p>
            </div>
          </AspectRatio>
        </div>
      </div>
    </div>
  ),
};
