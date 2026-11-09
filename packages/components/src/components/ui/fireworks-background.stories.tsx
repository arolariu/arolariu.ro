import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {FireworksBackground} from "./fireworks-background";
const storyStyles = `
.ac-story-fireworks-background-demo,
.ac-story-fireworks-background-resizableDemo {
  position: relative;
  height: 24rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-fireworks-background-resizableDemo {
  width: 70%;
  min-width: 12rem;
  min-height: 10rem;
  resize: both;
}

.ac-story-fireworks-background-demoContent {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 100%;
  place-content: center;
  padding: 2rem;
}
`;

const storyClasses = {
  demo: "ac-story-fireworks-background-demo",
  resizableDemo: "ac-story-fireworks-background-resizableDemo",
  demoContent: "ac-story-fireworks-background-demoContent",
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
  title: "Components/Backgrounds/FireworksBackground",
  component: FireworksBackground,
  tags: ["autodocs"],
  args: {population: 1},
  argTypes: {population: {control: {type: "range", min: 0, max: 5, step: 0.1}}},
  parameters: {
    docs: {
      description: {
        component:
          "Native DPR-aware canvas physics behind a native launch button. Automatic launches settle after five seconds unless `loop`; the launch button keeps working afterwards (and in click-only `population={0}`) and is `aria-disabled` under reduced motion, `motionPaused` or a hidden document. Pointer launches aim at element-local positions, not viewport coordinates. Timers/trails/particles are bounded; reduced motion/offscreen keeps a static starburst.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <FireworksBackground {...args}>
        <h2 className={storyClasses.demoContent}>Use the launch button</h2>
      </FireworksBackground>
    </div>
  ),
} satisfies Meta<typeof FireworksBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
/**
 * Continued automatic launches need a keyboard-operable pause control; while paused the launch button is `aria-disabled`.
 * Without `loop`, automatic launches settle within five seconds and the launch button keeps working.
 */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = useState(false);
    return (
      <>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume fireworks" : "Pause fireworks"}</Button>
        <div className={storyClasses.demo}>
          <FireworksBackground
            {...args}
            loop
            motionPaused={paused}
          />
        </div>
      </>
    );
  },
};
export const Default: Story = {};
export const HighFrequency: Story = {args: {population: 3}};
export const CustomColors: Story = {args: {color: ["#ff0080", "#00ff80", "#0080ff"], population: 1.5}};
/**
 * Click-only (`population={0}`) launches from the launch button, which keeps working after the five-second settle, in an
 * offset, element-resizable container.
 */
export const ElementResize: Story = {
  args: {population: 0},
  render: (args) => (
    <div className={storyClasses.resizableDemo}>
      <FireworksBackground {...args}>
        <p className={storyClasses.demoContent}>Resize, then use the launch button</p>
      </FireworksBackground>
    </div>
  ),
};
