import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {BubbleBackground} from "./bubble-background";
import styles from "./bubble-background.module.css";

const meta = {
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
    <div className={styles.demo}>
      <BubbleBackground {...args}>
        <h2 className={styles.demoContent}>Bubble background</h2>
      </BubbleBackground>
    </div>
  ),
} satisfies Meta<typeof BubbleBackground>;
export default meta;
type Story = StoryObj<typeof meta>;
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
    className: styles.customPaletteDemo,
  },
};
/** Each goo filter is scoped to its own instance. */
export const MultipleInstances: Story = {
  render: (args) => (
    <div className={styles.demoPair}>
      <div className={styles.demo}>
        <BubbleBackground {...args} />
      </div>
      <div className={styles.demo}>
        <BubbleBackground {...args} />
      </div>
    </div>
  ),
};
