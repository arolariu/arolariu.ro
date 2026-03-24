import {ChevronDown} from "lucide-react";
import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
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
    <Collapsible className='w-[350px]'>
      <CollapsibleTrigger asChild>
        <Button
          variant='ghost'
          className='w-full justify-between'>
          Show details
          <ChevronDown className='h-4 w-4' />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-4'>
        <p className='text-muted-foreground text-sm'>
          This is the collapsible content. It can contain any type of content including text, images, or other components.
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
      className='w-[350px]'>
      <CollapsibleTrigger asChild>
        <Button
          variant='outline'
          className='w-full justify-between'>
          Additional information
          <ChevronDown className='h-4 w-4' />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className='space-y-2 pt-4'>
        <p className='text-sm'>Item 1: First piece of information</p>
        <p className='text-sm'>Item 2: Second piece of information</p>
        <p className='text-sm'>Item 3: Third piece of information</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

/**
 * Controlled collapsible.
 */
function ControlledDemo() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className='space-y-4'>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className='w-[350px]'>
        <CollapsibleTrigger asChild>
          <Button
            variant='outline'
            className='w-full justify-between'>
            Toggle content
            <ChevronDown className='h-4 w-4' />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='pt-4'>
          <p className='text-muted-foreground text-sm'>
            This collapsible is controlled. The state is managed externally and displayed below.
          </p>
        </CollapsibleContent>
      </Collapsible>
      <p className='text-sm'>Status: {isOpen ? "Open" : "Closed"}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
};

function AnimatedCollapsibleContent(): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className='w-[350px]'>
      <CollapsibleTrigger asChild>
        <Button
          variant='outline'
          className='w-full justify-between'>
          Show details
          <ChevronDown
            className='h-4 w-4'
            style={{
              transition: "transform 0.3s",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className='pt-4'
        style={{
          overflow: "hidden",
          transition: "height 0.3s ease-out",
        }}>
        <div style={{padding: "1rem", background: "#f9fafb", borderRadius: "6px"}}>
          <p className='text-sm'>This content animates smoothly when expanding and collapsing.</p>
          <p
            className='text-muted-foreground text-sm'
            style={{marginTop: "0.5rem"}}>
            The height transition creates a polished user experience.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Collapsible with smooth height animation.
 */
export const Animated: Story = {
  render: () => <AnimatedCollapsibleContent />,
};

/**
 * Nested collapsible panels.
 */
export const Nested: Story = {
  render: () => (
    <Collapsible className='w-[350px]'>
      <CollapsibleTrigger asChild>
        <Button
          variant='outline'
          className='w-full justify-between'>
          Parent Section
          <ChevronDown className='h-4 w-4' />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-4'>
        <p
          className='text-sm'
          style={{marginBottom: "1rem"}}>
          This is the parent content area.
        </p>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-between'>
              Nested Section
              <ChevronDown className='h-4 w-4' />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='pt-2'>
            <p
              className='text-muted-foreground text-sm'
              style={{paddingLeft: "1rem"}}>
              This is nested content inside the parent collapsible.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  ),
};
