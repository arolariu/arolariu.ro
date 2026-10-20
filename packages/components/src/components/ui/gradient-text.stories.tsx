import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {useState} from "react";
import {Button} from "./button";
import {GradientText} from "./gradient-text";
const storyStyles = `
.ac-story-gradient-text-demo {
  display: grid;
  place-content: center;
  padding: 3rem;
  border-radius: var(--ac-radius-lg);
  color: var(--ac-foreground);
  background: var(--ac-background);
}

.ac-story-gradient-text-demoHeading {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

.ac-story-gradient-text-customGradientDemo {
  background: #fff;
}
`;

const storyClasses = {
  demo: "ac-story-gradient-text-demo",
  demoHeading: "ac-story-gradient-text-demoHeading",
  customGradientDemo: "ac-story-gradient-text-customGradientDemo",
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
  title: "Components/Typography/GradientText",
  component: GradientText,
  tags: ["autodocs"],
  args: {text: "Gradient text", neon: false},
  parameters: {
    docs: {
      description: {
        component:
          "Intentional decorative text effect. Neon is an aria-hidden duplicate. Reduced motion is static; forced colors restore CanvasText glyphs and remove the neon copy.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <h2 className={storyClasses.demoHeading}>
        <GradientText {...args} />
      </h2>
    </div>
  ),
} satisfies Meta<typeof GradientText>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Looping text keeps a keyboard-operable pause control alongside it. */
export const ControlledLoop: Story = {
  render: function ControlledLoop(args) {
    const [paused, setPaused] = useState(false);
    return (
      <div className={storyClasses.demo}>
        <Button onClick={() => setPaused(!paused)}>{paused ? "Resume text motion" : "Pause text motion"}</Button>
        <GradientText
          {...args}
          loop
          motionPaused={paused}
        />
      </div>
    );
  },
};
export const Default: Story = {};
export const WithNeon: Story = {args: {text: "Neon glow", neon: true}};
export const CustomGradient: Story = {
  args: {
    text: "Custom colors",
    gradient: "linear-gradient(90deg, #9d174d, #92400e, #115e59, #9d174d)",
    className: storyClasses.customGradientDemo,
  },
};
/** Check one accessible copy while the original image/content semantics remain intact. */
export const WithContent: Story = {args: {text: "Related content", neon: true, children: <span> — supplementary copy</span>}};
