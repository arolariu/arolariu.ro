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

const meta: Meta<typeof Tooltip> = {
  title: "Design System/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
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
