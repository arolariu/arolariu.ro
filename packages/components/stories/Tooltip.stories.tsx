import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Button,
} from "../dist";
import {
  InfoIcon,
  Settings2Icon,
  HelpCircleIcon,
  AlertCircleIcon,
} from "lucide-react";

const meta: Meta<typeof TooltipProvider> = {
  title: "Design System/Tooltip",
  // Showing TooltipProvider in the docs, but examples use Tooltip
  component: TooltipProvider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Tooltip Component**

Displays a small contextual pop-up label when a user hovers over or focuses an element, providing brief information or hints. Built upon the Radix UI Tooltip primitive. Requires a \`<TooltipProvider>\` ancestor.

**Core Components (from Radix UI):**
*   \`<TooltipProvider>\`: The root provider component that manages global tooltip behavior, such as open/close delays. It should wrap the application part where tooltips are used. Accepts \`delayDuration\` and \`skipDelayDuration\` props.
*   \`<Tooltip>\`: The main component managing the state for a single tooltip instance. Accepts props like \`open\`, \`defaultOpen\`, \`onOpenChange\`, \`delayDuration\`.
*   \`<TooltipTrigger>\`: The element (often a button or icon) that, when hovered or focused, triggers the tooltip to appear. It should wrap the interactive element. Handles ARIA attributes (\`aria-describedby\`).
*   \`<TooltipPortal>\`: (Optional) Renders the tooltip content into a specific part of the DOM. \`<TooltipContent>\` uses this by default.
*   \`<TooltipContent>\`: The container (\`<div>\` with \`role="tooltip"\`) for the content that appears in the pop-up. Handles positioning, styling, and accessibility attributes. Accepts props like \`side\`, \`sideOffset\`, \`align\`, \`alignOffset\`, \`avoidCollisions\`.
*   \`<TooltipArrow>\`: (Optional) Renders an arrow pointing from the content to the trigger.

**Key Features & Props (from Radix UI):**
*   **Trigger Interaction**: Opens on hover/focus of the trigger (after \`delayDuration\`) and closes on blur/pointer leave.
*   **Delay Control**: Global delays set on \`<TooltipProvider>\` (\`delayDuration\`, default 700ms; \`skipDelayDuration\`, default 300ms for quick re-opening). Can be overridden per \`<Tooltip>\`.
*   **Positioning**: Customizable positioning relative to the trigger using \`side\`, \`align\`, and offset props on \`<TooltipContent>\`. Includes collision detection.
*   **Accessibility**: Provides the correct ARIA role (\`role="tooltip"\`) and links the content to the trigger via \`aria-describedby\` for screen reader users. Tooltips are typically not focusable themselves.
*   **Provider Requirement**: Tooltips rely on the \`<TooltipProvider>\` to function correctly, managing delays and global state.

See the [shadcn/ui Tooltip documentation](https://ui.shadcn.com/docs/components/tooltip) and the [Radix UI Tooltip documentation](https://www.radix-ui.com/primitives/docs/components/tooltip) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"],
  // Wrap all stories in TooltipProvider
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

// Basic tooltip
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A basic Tooltip that appears when hovering over or focusing the trigger button. Displays simple text content.",
      },
    },
  },
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover Me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a basic tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

// With icon trigger
export const WithIconTrigger: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates using icons as triggers for the Tooltip.",
      },
    },
  },
  render: () => (
    <div className="flex gap-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="h-5 w-5 cursor-pointer text-blue-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Information tooltip</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Settings2Icon className="h-5 w-5 cursor-pointer text-gray-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings tooltip</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircleIcon className="h-5 w-5 cursor-pointer text-purple-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Help tooltip</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// With side and align options
export const Positioning: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates configuring the Tooltip to appear in different positions relative to the trigger element.",
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Top (Default)</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip positioned on top</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip positioned on right</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip positioned on bottom</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip positioned on left</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// With custom styling
export const CustomStyling: Story = {
  parameters: {
    docs: {
      description: {
        story: "Illustrates using custom styles for the Tooltip content.",
      },
    },
  },
  render: () => (
    <div className="flex gap-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Styled Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent className="bg-blue-600 text-white">
          <p>Custom blue tooltip</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Warning</Button>
        </TooltipTrigger>
        <TooltipContent className="bg-amber-500 text-black">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="h-4 w-4" />
            <p>Warning tooltip</p>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Error</Button>
        </TooltipTrigger>
        <TooltipContent className="bg-red-500">
          <p>Error message</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

// With delay duration
export const WithDelay: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows a Tooltip configured with a delay before it appears on hover/focus.",
      },
    },
  },
  render: () => (
    <TooltipProvider delayDuration={1000}>
      <div className="flex gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">1000ms Delay</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This tooltip has a 1 second delay</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

// With complex content
export const ComplexContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates using custom React components or richer content within the Tooltip instead of just plain text.",
      },
    },
  },
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Rich Tooltip</Button>
      </TooltipTrigger>
      <TooltipContent className="w-[200px] p-2">
        <div className="space-y-2">
          <h4 className="font-medium">Tooltip Title</h4>
          <p className="text-xs">
            This is a more detailed tooltip with multiple lines of text and
            formatting.
          </p>
          <div className="border-t pt-1 text-xs text-neutral-400">
            Press ESC to dismiss
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};
