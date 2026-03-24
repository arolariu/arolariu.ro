import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CardSkeleton} from "./card-skeleton";

const meta = {
  title: "Components/Feedback/CardSkeleton",
  component: CardSkeleton,
  tags: ["autodocs"],
  argTypes: {
    lines: {
      control: {type: "range", min: 1, max: 10, step: 1},
      description: "Number of body placeholder lines rendered in the card content area",
    },
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

/**
 * Multiple card skeletons in a grid layout.
 */
export const Grid: Story = {
  render: () => (
    <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem"}}>
      <CardSkeleton
        lines={3}
        aria-label='Loading card 1'
      />
      <CardSkeleton
        lines={4}
        aria-label='Loading card 2'
      />
      <CardSkeleton
        lines={2}
        aria-label='Loading card 3'
      />
    </div>
  ),
};
