import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {BubbleBackground} from "./bubble-background";
const storyStyles = `
.ac-story-bubble-background-demo {
  position: relative;
  height: 24rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
}

.ac-story-bubble-background-demoContent {
  position: relative;
  z-index: 1;
  display: grid;
  place-content: center;
  min-height: 100%;
  padding: 2rem;
  color: var(--ac-foreground);
}

.ac-story-bubble-background-demoPair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.ac-story-bubble-background-customPaletteDemo {
  opacity: 0.8;
}
`;

const storyClasses = {
  demo: "ac-story-bubble-background-demo",
  demoContent: "ac-story-bubble-background-demoContent",
  demoPair: "ac-story-bubble-background-demoPair",
  customPaletteDemo: "ac-story-bubble-background-customPaletteDemo",
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
  title: "Components/Backgrounds/BubbleBackground",
  component: BubbleBackground,
  tags: ["autodocs"],
  args: {interactive: false},
  parameters: {
    docs: {
      description: {
        component:
          "Palette channels accept comma or space RGB triplets and percentages. Caller style is merged with the palette. OS reduced motion/element visibility pauses drift and cursor following.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <BubbleBackground {...args}>
        <h2 className={storyClasses.demoContent}>Bubble background</h2>
      </BubbleBackground>
    </div>
  ),
} satisfies Meta<typeof BubbleBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Defaults settle within five seconds; intentional loops need an operable pause control. */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = useState(false);
    return (
      <>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume bubbles" : "Pause bubbles"}</Button>
        <div className={storyClasses.demo}>
          <BubbleBackground
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
export const Interactive: Story = {args: {interactive: true}};
/** Both supported channel syntaxes produce the same modern slash-alpha CSS grammar. */
export const CustomColors: Story = {
  args: {
    colors: {
      first: "255,20,147",
      second: "138 43 226",
      third: "0,191,255",
      fourth: "255 105 180",
      fifth: "147,112,219",
      sixth: "100% 0% 100%",
    },
    className: storyClasses.customPaletteDemo,
  },
};
/** Each goo filter is scoped to its own instance. */
export const MultipleInstances: Story = {
  render: (args) => (
    <div className={storyClasses.demoPair}>
      <div className={storyClasses.demo}>
        <BubbleBackground {...args} />
      </div>
      <div className={storyClasses.demo}>
        <BubbleBackground {...args} />
      </div>
    </div>
  ),
};
