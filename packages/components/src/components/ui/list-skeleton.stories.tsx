import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ListSkeleton} from "./list-skeleton";

const meta = {
  title: "Components/Feedback/ListSkeleton",
  component: ListSkeleton,
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: {type: "range", min: 1, max: 20, step: 1},
      description: "Number of list item placeholders to render",
    },
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

/**
 * List skeleton in a container.
 */
export const InContainer: Story = {
  render: () => (
    <div style={{maxWidth: "600px", padding: "1.5rem", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600"}}>Recent Activity</h3>
      <ListSkeleton
        items={6}
        showAvatar
        aria-label='Loading activity list'
      />
    </div>
  ),
};
