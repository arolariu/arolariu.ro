import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HoleBackground} from "./hole-background";
import styles from "./hole-background.module.css";

const meta = {
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
    <div className={styles.demo}>
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
    <div className={styles.resizableDemo}>
      <HoleBackground {...args}>
        <h2 className={styles.demoContent}>Foreground content</h2>
      </HoleBackground>
    </div>
  ),
};
