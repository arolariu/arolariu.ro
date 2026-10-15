import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger} from "./popover";
const storyStyles = `
.ac-story-popover-storyForm {
  display: grid;
  gap: var(--ac-space-3);
}

.ac-story-popover-storyField {
  display: grid;
  gap: var(--ac-space-1);
  font-size: var(--ac-text-sm);
}

.ac-story-popover-storyInput {
  padding: var(--ac-space-1) var(--ac-space-2);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-sm);
  background: var(--ac-background);
  color: var(--ac-foreground);
}
`;

const storyClasses = {
  storyForm: "ac-story-popover-storyForm",
  storyField: "ac-story-popover-storyField",
  storyInput: "ac-story-popover-storyInput",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Overlays/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single composed button and primitive-owned accessible naming. */
export const Default: Story = {
  render: (): React.JSX.Element => (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' />}>Open Popover</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover Title</PopoverTitle>
          <PopoverDescription>Choose an action. Escape closes the popup and returns focus.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

/** Native inputs receive focus inside the popup, not the Positioner. */
export const WithForm: Story = {
  render: (): React.JSX.Element => (
    <Popover>
      <PopoverTrigger render={<Button />}>Settings</PopoverTrigger>
      <PopoverContent className={storyClasses.storyForm}>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Adjust width and height.</PopoverDescription>
        </PopoverHeader>
        <label className={storyClasses.storyField}>
          Width
          <input
            className={storyClasses.storyInput}
            type='number'
            defaultValue={300}
          />
        </label>
        <label className={storyClasses.storyField}>
          Height
          <input
            className={storyClasses.storyInput}
            type='number'
            defaultValue={200}
          />
        </label>
      </PopoverContent>
    </Popover>
  ),
};

/** Placement options are separate from popup semantics. */
export const CustomPlacement: Story = {
  render: (): React.JSX.Element => (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' />}>Open Right</PopoverTrigger>
      <PopoverContent
        side='right'
        align='start'
        sideOffset={12}
        alignOffset={4}>
        <PopoverHeader>
          <PopoverTitle>Right Side Popover</PopoverTitle>
          <PopoverDescription>Aligned to the start of the trigger with explicit offsets.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

/** Nested roots maintain independent primitive-owned state and names. */
export const Nested: Story = {
  render: (): React.JSX.Element => (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' />}>Open Outer</PopoverTrigger>
      <PopoverContent className={storyClasses.storyForm}>
        <PopoverHeader>
          <PopoverTitle>Outer Popover</PopoverTitle>
          <PopoverDescription>This root coordinates its own focus and lifecycle.</PopoverDescription>
        </PopoverHeader>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                size='sm'
                variant='secondary'
              />
            }>
            Open Inner
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Inner Popover</PopoverTitle>
              <PopoverDescription>A separate nested popup.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </PopoverContent>
    </Popover>
  ),
};

function ExplicitAnchorExample(): React.JSX.Element {
  const anchor = React.useRef<HTMLDivElement>(null);
  return (
    <Popover>
      <div>
        <div ref={anchor}>Measured anchor element</div>
        <PopoverTrigger render={<Button variant='outline' />}>Open at the measured anchor</PopoverTrigger>
      </div>
      <PopoverContent
        anchor={anchor}
        side='bottom'
        align='start'>
        <PopoverHeader>
          <PopoverTitle>Explicit Anchor</PopoverTitle>
          <PopoverDescription>The Content.anchor ref selects the measured positioning element.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

/** A real measured element ref, not an implied legacy anchor registration. */
export const ExplicitAnchor: Story = {
  render: (): React.JSX.Element => <ExplicitAnchorExample />,
};

function FinalFocusExample(): React.JSX.Element {
  const finalFocus = React.useRef<HTMLButtonElement>(null);
  return (
    <div className={storyClasses.storyForm}>
      <Button
        ref={finalFocus}
        variant='secondary'>
        Requested return target
      </Button>
      <Popover>
        <PopoverTrigger render={<Button />}>Open and press Escape</PopoverTrigger>
        <PopoverContent finalFocus={finalFocus}>
          <PopoverHeader>
            <PopoverTitle>Custom Focus Return</PopoverTitle>
            <PopoverDescription>Escape requests focus on the separate return-target button.</PopoverDescription>
          </PopoverHeader>
          <button type='button'>Focusable popup action</button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Exercises the Popup-owned finalFocus contract. */
export const FinalFocus: Story = {
  render: (): React.JSX.Element => <FinalFocusExample />,
};
