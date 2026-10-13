import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CardSkeleton} from "./card-skeleton";
import styles from "./card-skeleton.module.css";

const meta = {
  title: "Components/Feedback/CardSkeleton",
  component: CardSkeleton,
  tags: ["autodocs"],
  args: {
    role: "status",
    "aria-label": "Loading summary",
    "aria-busy": true,
  },
  decorators: [
    (Story) => (
      <div className={styles.storyPreview}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    lines: {
      control: {type: "range", min: 0, max: 10, step: 1},
      description: "Body lines: integer 0–10,000; invalid values throw RangeError. This demo limits the slider to 10.",
    },
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
  },
} satisfies Meta<typeof CardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Card skeleton with default 3 content lines.
 */
export const Default: Story = {
  args: {
    lines: 3,
  },
};

/**
 * Card skeleton with minimal content.
 */
export const Minimal: Story = {
  args: {
    lines: 1,
  },
};

/**
 * Card skeleton with extended content.
 */
export const Extended: Story = {
  args: {
    lines: 6,
  },
};

/** Empty content preserves the decorative card header and action shape. */
export const EmptyContent: Story = {
  args: {lines: 0},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/**
 * Multiple card skeletons in a grid layout.
 */
export const Grid: Story = {
  render: () => (
    <section
      className={styles.storyGrid}
      role='status'
      aria-label='Loading summaries'
      aria-busy>
      <CardSkeleton lines={3} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={2} />
    </section>
  ),
};
