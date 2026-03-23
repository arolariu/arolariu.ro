import type {Meta, StoryObj} from "storybook-react-rsbuild";
import React from "react";
import {ChevronDown} from "lucide-react";
import {Button} from "./button";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";

const meta = {
  title: "Components/Layout/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic collapsible panel.
 */
export const Default: Story = {
  render: () => (
    <Collapsible className="w-[350px]">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          Show details
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <p className="text-sm text-muted-foreground">
          This is the collapsible content. It can contain any type of content including text, images, or other
          components.
        </p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Collapsible with default open state.
 */
export const DefaultOpen: Story = {
  render: () => (
    <Collapsible
      defaultOpen
      className="w-[350px]">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          Additional information
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-2">
        <p className="text-sm">Item 1: First piece of information</p>
        <p className="text-sm">Item 2: Second piece of information</p>
        <p className="text-sm">Item 3: Third piece of information</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Controlled collapsible.
 */
export const Controlled: Story = {
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div className="space-y-4">
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="w-[350px]">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Toggle content
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              This collapsible is controlled. The state is managed externally and displayed below.
            </p>
          </CollapsibleContent>
        </Collapsible>
        <p className="text-sm">Status: {isOpen ? "Open" : "Closed"}</p>
      </div>
    );
  },
};
