import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {DotBackground} from "./dot-background";
const storyStyles = `
.ac-story-dot-background-demo,
.ac-story-dot-background-resizableDemo {
  position: relative;
  height: 24rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-dot-background-resizableDemo {
  width: 70%;
  min-width: 12rem;
  min-height: 10rem;
  resize: both;
}

.ac-story-dot-background-demoContent {
  position: relative;
  display: grid;
  place-content: center;
  min-height: 100%;
  padding: 2rem;
}
`;

const storyClasses = {
  demo: "ac-story-dot-background-demo",
  resizableDemo: "ac-story-dot-background-resizableDemo",
  demoContent: "ac-story-dot-background-demoContent",
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
  title: "Components/Backgrounds/DotBackground",
  component: DotBackground,
  tags: ["autodocs"],
  args: {glow: false},
  argTypes: {width: {control: {type: "number", min: 1}}, height: {control: {type: "number", min: 1}}},
  parameters: {
    docs: {
      description: {
        component:
          "Width/height are positive dot spacing, not SVG dimensions. The element is observed for resize; dense grids are evenly bounded to 4096 dots. Glow pauses with reduced motion/offscreen policy.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <DotBackground {...args} />
      <h2 className={storyClasses.demoContent}>Dot background</h2>
    </div>
  ),
} satisfies Meta<typeof DotBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Pause remains available to keyboard and pointer users throughout a continued glow. */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = useState(false);
    return (
      <>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume glow" : "Pause glow"}</Button>
        <div className={storyClasses.demo}>
          <DotBackground
            {...args}
            glow
            loop
            motionPaused={paused}
          />
        </div>
      </>
    );
  },
};
export const Default: Story = {};
export const Glowing: Story = {args: {glow: true}};
export const Dense: Story = {args: {width: 4, height: 4, glow: true}};
/** Resize the native element without resizing the browser window. */
export const ElementResize: Story = {
  render: (args) => (
    <div className={storyClasses.resizableDemo}>
      <DotBackground {...args} />
      <p className={storyClasses.demoContent}>Drag the resize handle</p>
    </div>
  ),
};
