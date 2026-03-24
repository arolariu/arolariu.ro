import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "./tooltip";

const meta = {
  title: "Components/Overlays/Tooltip",
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

/**
 * Tooltip with custom delay before showing.
 */
export const WithDelay: Story = {
  render: () => (
    <TooltipProvider delayDuration={1000}>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover me (1s delay)</Button>
        </TooltipTrigger>
        <TooltipContent side='top'>
          This tooltip appears after a 1 second delay
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/**
 * Tooltip with rich formatted content including bold text and styling.
 */
function TooltipWithRichContent(): React.JSX.Element {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button variant='outline'>Hover for details</Button>
        </TooltipTrigger>
        <TooltipContent side='top' style={{maxWidth: "250px"}}>
          <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
            <div style={{fontWeight: "bold", fontSize: "14px"}}>Product Information</div>
            <div style={{fontSize: "12px", lineHeight: "1.5"}}>
              <strong>Status:</strong> In Stock
            </div>
            <div style={{fontSize: "12px", lineHeight: "1.5"}}>
              <strong>Price:</strong> $49.99
            </div>
            <a 
              href='#' 
              style={{fontSize: "12px", color: "inherit", textDecoration: "underline"}}
              onClick={(e) => e.preventDefault()}
            >
              View details →
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const WithRichContent: Story = {
  render: () => <TooltipWithRichContent />,
};
