import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ListSkeleton} from "./list-skeleton";
const storyStyles = `
.ac-story-list-skeleton-storyPreview {
  width: 36rem;
  max-width: 100%;
}

.ac-story-list-skeleton-storyPanel {
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg);
  background-color: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-list-skeleton-storyHeading {
  margin: 0 0 var(--ac-space-4);
  font-size: 1.25rem;
  font-weight: 600;
}
`;

const storyClasses = {
  storyPreview: "ac-story-list-skeleton-storyPreview",
  storyPanel: "ac-story-list-skeleton-storyPanel",
  storyHeading: "ac-story-list-skeleton-storyHeading",
} as const;

const meta = {
  title: "Components/Feedback/ListSkeleton",
  component: ListSkeleton,
  tags: ["autodocs"],
  args: {
    role: "status",
    "aria-label": "Loading results",
  },
  decorators: [
    (Story) => (
      <div className={storyClasses.storyPreview}>
        <Story />
      </div>
    ),

    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
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
      className={storyClasses.storyPanel}
      role='status'
      aria-labelledby='list-skeleton-heading'>
      <h2
        id='list-skeleton-heading'
        className={storyClasses.storyHeading}>
        Loading results
      </h2>
      <ListSkeleton
        items={6}
        showAvatar
      />
    </section>
  ),
};
