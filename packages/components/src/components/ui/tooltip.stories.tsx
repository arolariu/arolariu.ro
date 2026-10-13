import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger} from "./tooltip";
import styles from "./tooltip.module.css";

const meta = {
  title: "Components/Overlays/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>Hover me (top)</TooltipTrigger>
        <TooltipContent side='top'>Tooltip above the trigger</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Bottom: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>Hover me (bottom)</TooltipTrigger>
        <TooltipContent
          side='bottom'
          align='start'
          alignOffset={4}>
          Start-aligned below the trigger
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Left: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>Hover me (left)</TooltipTrigger>
        <TooltipContent
          side='left'
          sideOffset={8}>
          Tooltip left of the trigger
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Right: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>Hover me (right)</TooltipTrigger>
        <TooltipContent side='right'>Tooltip right of the trigger</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** Provider owns the initial delay and the adjacent-tooltip instant window. */
export const WithDelay: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider
      delayDuration={1000}
      timeout={400}>
      <div className={styles.storyGroup}>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>First tooltip (1s)</TooltipTrigger>
          <TooltipContent>Wait one second on hover; keyboard focus opens immediately.</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>Adjacent tooltip</TooltipTrigger>
          <TooltipContent>The group opens adjacent tooltips immediately while active.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

/** Non-interactive rich copy and an explicitly composed Arrow part. */
export const WithRichContent: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>Hover for details</TooltipTrigger>
        <TooltipContent showArrow={false}>
          <div className={styles.storyContent}>
            <strong>Product Information</strong>
            <span>Status: In stock</span>
            <span>Price: $49.99</span>
          </div>
          <TooltipArrow />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** A root-local legacy delay is supplied to Trigger, not unsupported Root.delay. */
export const LegacyRootDelay: Story = {
  render: (): React.JSX.Element => (
    <TooltipProvider delay={1000}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger render={<Button />}>Immediate legacy root override</TooltipTrigger>
        <TooltipContent showArrow={false}>No default arrow; zero-delay trigger contract.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

/** Wrapper-owned semantics merge an existing hint with a real, SDK-opened tooltip description. */
export const AccessibleDescription: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyGroup}>
      <span id='tooltip-existing-hint'>An existing description remains associated.</span>
      <Tooltip delayDuration={0}>
        <TooltipTrigger
          aria-describedby='tooltip-existing-hint'
          render={<Button variant='outline' />}>
          Hover or focus for an additional description
        </TooltipTrigger>
        <TooltipContent id='tooltip-accessible-detail'>This real popup adds its description while open.</TooltipContent>
      </Tooltip>
    </div>
  ),
};
