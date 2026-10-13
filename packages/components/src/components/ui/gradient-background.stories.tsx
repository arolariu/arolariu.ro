import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientBackground} from "./gradient-background";
import styles from "./gradient-background.module.css";

const meta = {
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
    <div className={styles.demo}>
      <GradientBackground {...args}>
        <h2 className={styles.demoContent}>Gradient background</h2>
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
    <div className={styles.demo}>
      <GradientBackground {...args}>
        <div className={styles.demoContent}>
          <h2>Foreground content</h2>
          <button type='button'>Native action</button>
        </div>
      </GradientBackground>
    </div>
  ),
};
