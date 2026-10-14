import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Bubble, BubbleContent, BubbleGroup, BubbleReactions, type BubbleVariant} from "./bubble";
import {Button} from "./button";
const storyStyles = `
.ac-story-bubble-storyStack {
  inline-size: min(32rem, 90vw);
  gap: var(--ac-space-6);
}
`;

const storyClasses = {
  storyStack: "ac-story-bubble-storyStack",
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
  title: "Components/Data Display/Bubble",
  component: Bubble,
  tags: ["autodocs"],
  argTypes: {
    variant: {control: "select", options: ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"]},
    align: {control: "select", options: ["start", "end"]},
  },
} satisfies Meta<typeof Bubble>;
export default meta;
type Story = StoryObj<typeof meta>;

const variants = ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"] as const satisfies readonly BubbleVariant[];

export const Default: Story = {
  args: {variant: "default", align: "start"},
  render: (args): React.JSX.Element => (
    <Bubble {...args}>
      <BubbleContent>Text provided by the caller.</BubbleContent>
      <BubbleReactions aria-label='Message reactions'>👍 2</BubbleReactions>
    </Bubble>
  ),
};

export const SevenSurfaces: Story = {
  render: (): React.JSX.Element => (
    <BubbleGroup className={storyClasses.storyStack}>
      {variants.map((variant, index) => (
        <Bubble
          key={variant}
          variant={variant}
          align={index % 2 === 0 ? "start" : "end"}>
          <BubbleContent>
            {variant}: caller-provided text and <a href='#bubble-details'>details</a>.
          </BubbleContent>
        </Bubble>
      ))}
    </BubbleGroup>
  ),
};

function CallerOwnedReaction(): React.JSX.Element {
  const [reacted, setReacted] = React.useState(false);
  return (
    <BubbleGroup className={storyClasses.storyStack}>
      <Bubble variant='secondary'>
        <BubbleContent>The caller owns this reaction, not the Bubble.</BubbleContent>
        <BubbleReactions
          side='bottom'
          align='start'>
          <Button
            size='xs'
            variant='ghost'
            aria-pressed={reacted}
            aria-label='React with thumbs up'
            onClick={() => setReacted((previous) => !previous)}>
            👍 {reacted ? 1 : 0}
          </Button>
        </BubbleReactions>
      </Bubble>
      <Bubble
        align='end'
        variant='outline'>
        <BubbleContent>Top/end placement</BubbleContent>
        <BubbleReactions
          side='top'
          align='end'>
          ❤️ 3
        </BubbleReactions>
      </Bubble>
    </BubbleGroup>
  );
}

export const CallerOwnedReactions: Story = {render: (): React.JSX.Element => <CallerOwnedReaction />};

export const NativeRenderAndNavigation: Story = {
  render: (): React.JSX.Element => (
    <BubbleGroup className={storyClasses.storyStack}>
      <Bubble variant='outline'>
        <BubbleContent render={<a href='#bubble-details' />}>Open linked message</BubbleContent>
      </Bubble>
      <Bubble>
        <BubbleContent
          render={(props, state): React.ReactElement => (
            <button
              {...props}
              type='button'
              data-example-slot={state.slot}
            />
          )}>
          Caller-composed native button
        </BubbleContent>
      </Bubble>
    </BubbleGroup>
  ),
};

export const EmptyErrorLongContentAndRTL: Story = {
  render: (): React.JSX.Element => (
    <BubbleGroup
      dir='rtl'
      className={storyClasses.storyStack}>
      <Bubble variant='ghost'>
        <BubbleContent>No message content yet.</BubbleContent>
      </Bubble>
      <Bubble variant='destructive'>
        <BubbleContent>Could not prepare this message. The caller can offer a retry.</BubbleContent>
      </Bubble>
      <Bubble align='end'>
        <BubbleContent>رسالة طويلة يملكها المستدعي مع اتجاه من اليمين إلى اليسار</BubbleContent>
        <BubbleReactions align='start'>👍</BubbleReactions>
      </Bubble>
      <Bubble variant='muted'>
        <BubbleContent>{"LongUnbrokenCallerContent".repeat(15)}</BubbleContent>
      </Bubble>
      <Bubble variant='outline'>
        <BubbleContent aria-label='Empty bubble content' />
      </Bubble>
    </BubbleGroup>
  ),
};
