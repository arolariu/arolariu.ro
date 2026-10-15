import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {HighlightText} from "./highlight-text";
const storyStyles = `
.ac-story-highlight-text-demo {
  padding: 2rem;
  font-size: 1.25rem;
  line-height: 2;
  color: var(--ac-foreground);
  background: var(--ac-background);
}

.ac-story-highlight-text-demoLead {
  display: grid;
  min-height: 100svh;
  place-content: center;
}
`;

const storyClasses = {
  demo: "ac-story-highlight-text-demo",
  demoLead: "ac-story-highlight-text-demoLead",
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
  title: "Components/Typography/HighlightText",
  component: HighlightText,
  tags: ["autodocs"],
  args: {text: "highlighted text", inView: false},
  parameters: {
    docs: {
      description: {
        component:
          "Inline span semantics are preserved. Viewport options gate the highlight, never the text. OS reduced motion renders a completed static highlight.",
      },
    },
  },
  render: (args) => (
    <p className={storyClasses.demo}>
      Content with <HighlightText {...args} /> in the middle of a paragraph.
    </p>
  ),
} satisfies Meta<typeof HighlightText>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Custom repeated sweeps must offer pause, not merely pause when offscreen. */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = useState(false);
    return (
      <div className={storyClasses.demo}>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume highlight" : "Pause highlight"}</Button>
        <HighlightText
          loop
          motionPaused={paused}
          animate={{backgroundSize: ["0% 100%", "100% 100%"]}}
          transition={{duration: 2, repeat: Infinity}}
          {...args}
        />
      </div>
    );
  },
};
export const Default: Story = {};
export const OnScroll: Story = {
  args: {text: "important information", inView: true, inViewOnce: false},
  render: (args) => (
    <div>
      <div className={storyClasses.demoLead}>Scroll down to the highlight</div>
      <p className={storyClasses.demo}>
        Read the <HighlightText {...args} />. Reduced motion shows the completed highlight immediately.
      </p>
    </div>
  ),
};
export const Multiple: Story = {
  render: () => (
    <p className={storyClasses.demo}>
      Build <HighlightText text='faster' />, deploy <HighlightText text='easier' />, and scale <HighlightText text='confidently' />.
    </p>
  ),
};
