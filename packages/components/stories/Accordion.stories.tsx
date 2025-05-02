import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../dist";

const meta: Meta<typeof Accordion> = {
  title: "Design System/Accordion",
  component: Accordion,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Accordion Component**

A vertically stacked set of interactive headings that each reveal a section of content. Built upon the Radix UI Accordion primitive, ensuring accessibility and keyboard navigation.

**Core Components:**
*   \`<Accordion>\`: The root component that manages the state and context for its items. It accepts props like \`type\` ('single' or 'multiple'), \`collapsible\` (for single type), \`value\`, \`defaultValue\`, and \`onValueChange\`.
*   \`<AccordionItem>\`: Represents a single section within the accordion. Requires a unique \`value\` prop.
*   \`<AccordionTrigger>\`: The interactive header element (usually a button) that controls the open/closed state of its associated \`<AccordionContent>\`. Automatically handles ARIA attributes.
*   \`<AccordionContent>\`: The container for the content that is revealed when the item is open. Handles the animation and visibility.

**Key Features:**
*   Supports both single expansion (only one item open at a time) and multiple expansion modes.
*   Provides smooth animations for opening and closing content sections.
*   Fully accessible, adhering to WAI-ARIA patterns for accordions.

See the [shadcn/ui Accordion documentation](https://ui.shadcn.com/docs/components/accordion) for more details and examples.
        `,
      },
    },
  },
  argTypes: {
    type: {
      options: ["single", "multiple"],
      control: { type: "radio" },
      description:
        "Determines whether one or multiple items can be opened at the same time.",
      table: {
        defaultValue: { summary: "single" },
      },
    },
    collapsible: {
      control: "boolean",
      description:
        "When \`type\` is \`single\`, allows closing the currently open item.",
      table: {
        defaultValue: { summary: "false" },
      },
    },
    // Note: Other props like `value`, `defaultValue`, `onValueChange` are available
    // but less common to control directly via Storybook args for the root Accordion.
  },
};

export default meta;

type Story = StoryObj<typeof Accordion>;

// Basic accordion with single expansion
export const Single: Story = {
  args: {
    type: "single",
    collapsible: true,
    className: "w-full max-w-md",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A basic accordion where only one item can be open at a time. `collapsible` allows closing the open item.",
      },
    },
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that matches the other components'
          aesthetic.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>
          Yes. It's animated by default, but you can disable it if you prefer.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

// Multiple items can be expanded at once
export const Multiple: Story = {
  args: {
    type: "multiple",
    className: "w-full max-w-md",
  },
  parameters: {
    docs: {
      description: {
        story:
          "An accordion where multiple items can be open simultaneously by setting `type='multiple'`.",
      },
    },
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1">
        <AccordionTrigger>Configuration</AccordionTrigger>
        <AccordionContent>
          You can configure the accordion to allow multiple items to be opened
          at the same time.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Customization</AccordionTrigger>
        <AccordionContent>
          The component can be customized with your own classes and styles.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Accessibility</AccordionTrigger>
        <AccordionContent>
          Built with full keyboard navigation and screen reader support.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

// Custom styled accordion
export const CustomStyled: Story = {
  args: {
    type: "single",
    collapsible: true,
    className: "w-full max-w-md",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates applying custom CSS classes to the Accordion and its parts for unique styling.",
      },
    },
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1" className="border-b border-blue-200">
        <AccordionTrigger className="text-blue-600 hover:text-blue-800">
          Custom Colors
        </AccordionTrigger>
        <AccordionContent className="text-gray-600">
          This accordion has custom colors applied to demonstrate styling
          capabilities.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2" className="border-b border-blue-200">
        <AccordionTrigger className="text-blue-600 hover:text-blue-800">
          Custom Borders
        </AccordionTrigger>
        <AccordionContent className="text-gray-600">
          Custom border styles can be applied to match your design system.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3" className="border-b border-blue-200">
        <AccordionTrigger className="text-blue-600 hover:text-blue-800">
          Custom Typography
        </AccordionTrigger>
        <AccordionContent className="text-gray-600">
          You can customize the typography by applying your own text classes.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
