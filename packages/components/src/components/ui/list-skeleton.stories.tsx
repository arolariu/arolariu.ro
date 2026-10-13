import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ListSkeleton} from "./list-skeleton";
import styles from "./list-skeleton.module.css";

const meta = {
  title: "Components/Feedback/ListSkeleton",
  component: ListSkeleton,
  tags: ["autodocs"],
  args: {
    role: "status",
    "aria-label": "Loading results",
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
    items: {
      control: {type: "range", min: 0, max: 20, step: 1},
      description: "Items: integer 0–10,000; invalid values throw RangeError. This demo limits the slider to 20.",
    },
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
    showAvatar: {
      control: "boolean",
      description: "Whether each item should render a leading circular avatar placeholder",
    },
  },
} satisfies Meta<typeof ListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * List skeleton with default 5 items and avatars.
 */
export const Default: Story = {
  args: {
    items: 5,
    showAvatar: true,
  },
};

/**
 * List skeleton without avatars.
 */
export const NoAvatars: Story = {
  args: {
    items: 5,
    showAvatar: false,
  },
};

/**
 * Long list skeleton with many items.
 */
export const LongList: Story = {
  args: {
    items: 12,
    showAvatar: true,
  },
};

/** Zero items render an empty layout with caller-owned loading semantics. */
export const Empty: Story = {
  args: {items: 0},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/**
 * List skeleton in a container.
 */
export const InContainer: Story = {
  render: () => (
    <section
      className={styles.storyPanel}
      role='status'
      aria-labelledby='list-skeleton-heading'
      aria-busy>
      <h2
        id='list-skeleton-heading'
        className={styles.storyHeading}>
        Loading results
      </h2>
      <ListSkeleton
        items={6}
        showAvatar
      />
    </section>
  ),
};
