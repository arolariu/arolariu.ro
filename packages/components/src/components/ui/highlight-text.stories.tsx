import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HighlightText} from "./highlight-text";
import styles from "./highlight-text.module.css";

const meta = {
  title: "Components/Typography/HighlightText",
  component: HighlightText,
  tags: ["autodocs"],
  args: {text: "highlighted text", inView: false},
  parameters: {
    docs: {
      description: {
        component:
          "Inline span semantics are preserved. Viewport options gate the highlight, never the text. OS reduced motion renders a completed static highlight.",
      },
    },
  },
  render: (args) => (
    <p className={styles.demo}>
      Content with <HighlightText {...args} /> in the middle of a paragraph.
    </p>
  ),
} satisfies Meta<typeof HighlightText>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OnScroll: Story = {
  args: {text: "important information", inView: true, inViewOnce: false},
  render: (args) => (
    <div>
      <div className={styles.demoLead}>Scroll down to the highlight</div>
      <p className={styles.demo}>
        Read the <HighlightText {...args} />. Reduced motion shows the completed highlight immediately.
      </p>
    </div>
  ),
};
export const Multiple: Story = {
  render: () => (
    <p className={styles.demo}>
      Build <HighlightText text='faster' />, deploy <HighlightText text='easier' />, and scale <HighlightText text='confidently' />.
    </p>
  ),
};
