import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HoleBackground} from "./hole-background";
const storyStyles = `
.ac-story-hole-background-demo,
.ac-story-hole-background-resizableDemo {
  position: relative;
  height: 30rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-hole-background-resizableDemo {
  width: 70%;
  min-width: 12rem;
  min-height: 10rem;
  resize: both;
}

.ac-story-hole-background-demoContent {
  position: relative;
  z-index: 10;
  display: grid;
  min-height: 100%;
  place-content: center;
  padding: 2rem;
}
`;

const storyClasses = {
  demo: "ac-story-hole-background-demo",
  resizableDemo: "ac-story-hole-background-resizableDemo",
  demoContent: "ac-story-hole-background-demoContent",
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
  title: "Components/Backgrounds/HoleBackground",
  component: HoleBackground,
  tags: ["autodocs"],
  args: {strokeColor: "#737373", numberOfLines: 50, numberOfDiscs: 50},
  argTypes: {numberOfLines: {control: {type: "range", min: 1, max: 256}}, numberOfDiscs: {control: {type: "range", min: 1, max: 256}}},
  parameters: {
    docs: {
      description: {
        component:
          "Element/DPR-observed tunnel geometry with cached lines and particles. Motion pauses when reduced/offscreen; foreground children and the public canvas ref remain intact.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <HoleBackground {...args} />
    </div>
  ),
} satisfies Meta<typeof HoleBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Colored: Story = {args: {strokeColor: "#3b82f6", particleRGBColor: [59, 130, 246]}};
export const Dense: Story = {args: {numberOfLines: 80, numberOfDiscs: 80, particleRGBColor: [139, 92, 246]}};
/** Resize the element; only decoration is hidden in forced colors. */
export const ElementResize: Story = {
  render: (args) => (
    <div className={storyClasses.resizableDemo}>
      <HoleBackground {...args}>
        <h2 className={storyClasses.demoContent}>Foreground content</h2>
      </HoleBackground>
    </div>
  ),
};
