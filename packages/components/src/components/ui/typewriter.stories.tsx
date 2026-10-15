import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {Button} from "./button";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";
const storyStyles = `
.ac-story-typewriter-storyAccent {
  color: var(--ac-primary);
}

.ac-story-typewriter-storyCode {
  padding: var(--ac-space-4);
  border-radius: var(--ac-radius-lg);
  background: var(--ac-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.ac-story-typewriter-storyStack {
  display: grid;
  gap: var(--ac-space-4);
}
`;

const storyClasses = {
  storyAccent: "ac-story-typewriter-storyAccent",
  storyCode: "ac-story-typewriter-storyCode",
  storyStack: "ac-story-typewriter-storyStack",
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
  title: "Components/Typography/Typewriter",
  component: TypewriterText,
  tags: ["autodocs"],
  args: {words: [{text: "Welcome"}, {text: "to"}, {text: "the"}, {text: "future"}]},
} satisfies Meta<typeof TypewriterText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const StyledWords: Story = {
  args: {words: [{text: "Build"}, {text: "accessible", className: cn(storyClasses.storyAccent)}, {text: "interfaces"}]},
};
export const Smooth: Story = {
  render: (args) => (
    <TypewriterTextSmooth
      {...args}
      aria-label='Smooth greeting'
    />
  ),
};
export const LongText: Story = {
  args: {words: [{text: "Experience"}, {text: "the"}, {text: "power"}, {text: "of"}, {text: "accessible"}, {text: "text"}]},
};
export const CodeTyping: Story = {
  args: {words: [{text: "npm"}, {text: "install"}, {text: "@arolariu/components"}], className: storyClasses.storyCode},
};
export const MultiLine: Story = {
  render: (args) => (
    <div className={storyClasses.storyStack}>
      <TypewriterText {...args} />
      <TypewriterTextSmooth words={[{text: "Complete"}, {text: "accessible"}, {text: "phrase"}]} />
    </div>
  ),
};

function ChangingWords(): React.JSX.Element {
  const [changed, setChanged] = React.useState(false);
  const words = changed ? [{text: "Updated"}, {text: "phrase"}] : [{text: "Initial"}, {text: "phrase"}];
  return (
    <div className={storyClasses.storyStack}>
      <TypewriterText words={words} />
      <TypewriterTextSmooth words={words} />
      <Button
        size='sm'
        onClick={() => setChanged((value) => !value)}>
        Change words
      </Button>
      <p>Enable reduced motion in your operating system to see the completed static state.</p>
    </div>
  );
}
export const DynamicWords: Story = {render: () => <ChangingWords />};

/** Both intentionally continued cursors share a caller-owned keyboard-operable control. */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = React.useState(false);
    return (
      <div className={storyClasses.storyStack}>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume cursor" : "Pause cursor"}</Button>
        <TypewriterText
          {...args}
          loop
          motionPaused={paused}
        />
        <TypewriterTextSmooth
          {...args}
          loop
          motionPaused={paused}
        />
      </div>
    );
  },
};
