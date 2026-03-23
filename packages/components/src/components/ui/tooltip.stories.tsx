import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "./tooltip";

const meta = {
  component: Tooltip,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover me (top)</Button>
        </TooltipTrigger>
        <TooltipContent side='top'>This is a tooltip on the top</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Bottom: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover me (bottom)</Button>
        </TooltipTrigger>
        <TooltipContent side='bottom'>This is a tooltip on the bottom</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Left: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover me (left)</Button>
        </TooltipTrigger>
        <TooltipContent side='left'>This is a tooltip on the left</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Right: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover me (right)</Button>
        </TooltipTrigger>
        <TooltipContent side='right'>This is a tooltip on the right</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
