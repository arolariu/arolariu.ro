import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Button,
} from "../dist";
import { ChevronDownIcon } from "lucide-react";

const meta: Meta<typeof Collapsible> = {
  title: "Design System/Collapsible",
  component: Collapsible,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Collapsible Component**

An interactive component that toggles the visibility of a content section, often used for accordions, disclosure widgets, or hiding/showing details. Built upon the Radix UI Collapsible primitive.

**Core Components:**
*   \`<Collapsible>\`: The root component that manages the open/closed state and provides context. Accepts props like \`open\`, \`defaultOpen\`, \`onOpenChange\`, and \`disabled\`.
*   \`<CollapsibleTrigger>\`: The interactive element (usually a \`<button>\`) that controls the state of the collapsible. Clicking it toggles the visibility of the \`<CollapsibleContent>\`. Automatically handles ARIA attributes (\`aria-controls\`, \`aria-expanded\`).
*   \`<CollapsibleContent>\`: The container for the content that is conditionally rendered or hidden based on the collapsible's state. Handles animation and visibility.

**Key Features & Props (from Radix UI):**
*   **State Management**: Supports both controlled (\`open\`, \`onOpenChange\`) and uncontrolled (\`defaultOpen\`) state management.
*   **Animation**: Provides smooth height transition animations for opening and closing the content area.
*   **Accessibility**: Adheres to WAI-ARIA patterns for disclosure widgets, ensuring proper keyboard navigation and screen reader announcements via the trigger and content attributes.
*   **Disabled State**: The \`disabled\` prop on the root component prevents interaction with the trigger.

See the [shadcn/ui Collapsible documentation](https://ui.shadcn.com/docs/components/collapsible) and the [Radix UI Collapsible documentation](https://www.radix-ui.com/primitives/docs/components/collapsible) for more details.
        `,
      },
    },
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "The controlled open state of the collapsible.",
    },
    defaultOpen: {
      control: "boolean",
      description: "The initial open state when uncontrolled.",
    },
    onOpenChange: {
      action: "openChange",
      description: "Event handler called when the open state changes.",
    },
    disabled: {
      control: "boolean",
      description: "Prevents the collapsible from being opened or closed.",
      table: {
        defaultValue: { summary: "Lorem Ipsum" },
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

// Basic collapsible
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A simple collapsible with a trigger button (using an icon) and content that toggles visibility.",
      },
    },
  },
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px]">
        <div className="flex items-center justify-between px-4 py-2 border rounded-md">
          <h4 className="text-sm font-semibold">Toggle content visibility</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="px-4 py-2 text-sm border-x border-b rounded-b-md">
          <div className="p-2">
            This content can be collapsed and expanded with the button above.
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};

// Collapsible with custom trigger
export const CustomTrigger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates using a different element (a Button with text and icon) as the trigger, changing its text based on the open state.",
      },
    },
  },
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px]">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              {isOpen ? "Hide" : "Show"} Details
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "transform rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 rounded-md border p-4 shadow-sm">
          <div className="space-y-2">
            <h4 className="font-medium">Product Details</h4>
            <p>
              This is additional information about the product that can be
              toggled.
            </p>
            <p>Contains specifications, features, and other useful details.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};

// FAQ style collapsible
export const FAQStyle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how multiple Collapsible components can be used to create an FAQ-like interface, where each question acts as a trigger.",
      },
    },
  },
  render: () => {
    const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({
      "item-1": false,
      "item-2": false,
      "item-3": false,
    });

    const toggleItem = (item: string) => {
      setOpenItems((prev) => ({
        ...prev,
        [item]: !prev[item],
      }));
    };

    return (
      <div className="w-[500px] space-y-2">
        <Collapsible
          open={openItems["item-1"]}
          onOpenChange={() => toggleItem("item-1")}
          className="border rounded-md"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <h4 className="font-medium">How do I create an account?</h4>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openItems["item-1"] ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 text-sm border-t">
            <p>
              To create an account, click on the "Sign Up" button in the top
              right corner of the page and follow the instructions.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={openItems["item-2"]}
          onOpenChange={() => toggleItem("item-2")}
          className="border rounded-md"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <h4 className="font-medium">How do I reset my password?</h4>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openItems["item-2"] ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 text-sm border-t">
            <p>
              To reset your password, click on the "Forgot Password" link on the
              login page and follow the instructions sent to your email.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          open={openItems["item-3"]}
          onOpenChange={() => toggleItem("item-3")}
          className="border rounded-md"
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <h4 className="font-medium">How do I contact support?</h4>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${
                  openItems["item-3"] ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 text-sm border-t">
            <p>
              You can contact our support team by sending an email to
              support@example.com or by using the contact form on our website.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  },
};
