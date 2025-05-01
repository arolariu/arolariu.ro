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
};

export default meta;

type Story = StoryObj<typeof Accordion>;

// Basic accordion with single expansion
export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
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
  render: () => (
    <Accordion type="multiple" className="w-full max-w-md">
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
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
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
