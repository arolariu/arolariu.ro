import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FireworksBackground} from "./fireworks-background";
import styles from "./fireworks-background.module.css";

const meta = {
  title: "Components/Backgrounds/FireworksBackground",
  component: FireworksBackground,
  tags: ["autodocs"],
  args: {population: 1},
  argTypes: {population: {control: {type: "range", min: 0, max: 5, step: 0.1}}},
  parameters: {
    docs: {
      description: {
        component:
          "Native DPR-aware canvas physics. Click positions are element-local, not viewport coordinates. Timers/trails/particles are bounded. Reduced motion/offscreen policy keeps a static starburst.",
      },
    },
  },
  render: (args) => (
    <div className={styles.demo}>
      <FireworksBackground {...args}>
        <h2 className={styles.demoContent}>Click to launch</h2>
      </FireworksBackground>
    </div>
  ),
} satisfies Meta<typeof FireworksBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const HighFrequency: Story = {args: {population: 3}};
export const CustomColors: Story = {args: {color: ["#ff0080", "#00ff80", "#0080ff"], population: 1.5}};
/** Click-only launches in an offset, element-resizable container. */
export const ElementResize: Story = {
  args: {population: 0},
  render: (args) => (
    <div className={styles.resizableDemo}>
      <FireworksBackground {...args}>
        <p className={styles.demoContent}>Resize, then click</p>
      </FireworksBackground>
    </div>
  ),
};
