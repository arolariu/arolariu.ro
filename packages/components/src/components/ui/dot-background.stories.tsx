import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {DotBackground} from "./dot-background";
import styles from "./dot-background.module.css";

const meta = {
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
    <div className={styles.demo}>
      <DotBackground {...args} />
      <h2 className={styles.demoContent}>Dot background</h2>
    </div>
  ),
} satisfies Meta<typeof DotBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Glowing: Story = {args: {glow: true}};
export const Dense: Story = {args: {width: 4, height: 4, glow: true}};
/** Resize the native element without resizing the browser window. */
export const ElementResize: Story = {
  render: (args) => (
    <div className={styles.resizableDemo}>
      <DotBackground {...args} />
      <p className={styles.demoContent}>Drag the resize handle</p>
    </div>
  ),
};
