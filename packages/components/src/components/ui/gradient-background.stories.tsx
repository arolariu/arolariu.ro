import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientBackground} from "./gradient-background";
const storyStyles = `
.ac-story-gradient-background-demo {
  position: relative;
  height: 24rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
  color: var(--ac-foreground);
}

.ac-story-gradient-background-demoContent {
  display: grid;
  place-content: center;
  min-height: 100%;
  gap: 1rem;
  padding: 2rem;
}
`;

const storyClasses = {
  demo: "ac-story-gradient-background-demo",
  demoContent: "ac-story-gradient-background-demoContent",
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
  title: "Components/Backgrounds/GradientBackground",
  component: GradientBackground,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Motion background-position sweep with a static reduced-motion/offscreen alternative. Foreground content remains native; forced colors use Canvas/CanvasText.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <GradientBackground {...args}>
        <h2 className={storyClasses.demoContent}>Gradient background</h2>
      </GradientBackground>
    </div>
  ),
} satisfies Meta<typeof GradientBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const FastAnimation: Story = {args: {transition: {duration: 5, ease: "easeInOut", repeat: Infinity}}};
export const WithContent: Story = {
  render: (args) => (
    <div className={storyClasses.demo}>
      <GradientBackground {...args}>
        <div className={storyClasses.demoContent}>
          <h2>Foreground content</h2>
          <button type='button'>Native action</button>
        </div>
      </GradientBackground>
    </div>
  ),
};
