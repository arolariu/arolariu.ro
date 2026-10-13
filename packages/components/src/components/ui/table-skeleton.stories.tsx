import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {TableSkeleton} from "./table-skeleton";
import styles from "./table-skeleton.module.css";

const meta = {
  title: "Components/Feedback/TableSkeleton",
  component: TableSkeleton,
  tags: ["autodocs"],
  args: {
    role: "status",
    "aria-label": "Loading records",
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
    rows: {
      control: {type: "range", min: 0, max: 20, step: 1},
      description: "Rows: integer 0–10,000; total cells including the header must be ≤10,000. Demo slider limited to 20.",
    },
    columns: {
      control: {type: "range", min: 0, max: 10, step: 1},
      description: "Columns: integer 0–10,000; total cells including the header must be ≤10,000. Demo slider limited to 10.",
    },
    showHeader: {control: "boolean", description: "Show the decorative header; its cells contribute to the total limit"},
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
  },
} satisfies Meta<typeof TableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Table skeleton with default dimensions.
 */
export const Default: Story = {
  args: {
    rows: 5,
    columns: 4,
  },
};

/**
 * Compact table skeleton.
 */
export const Compact: Story = {
  args: {
    rows: 3,
    columns: 3,
  },
};

/**
 * Wide table skeleton with many columns.
 */
export const Wide: Story = {
  args: {
    rows: 5,
    columns: 8,
  },
};

/** Body placeholders without a header. */
export const WithoutHeader: Story = {
  args: {showHeader: false},
};

/** Zero body rows preserve the decorative header. */
export const HeaderOnly: Story = {
  args: {rows: 0},
};

/** Zero columns preserve empty row shapes, without pretending to be a table. */
export const ZeroColumns: Story = {
  args: {columns: 0, rows: 3},
};

/** Both axes may be zero; the optional header can be omitted too. */
export const Empty: Story = {
  args: {rows: 0, columns: 0, showHeader: false},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/**
 * Table skeleton in a container.
 */
export const InContainer: Story = {
  render: () => (
    <section
      className={styles.storyPanel}
      role='status'
      aria-labelledby='table-skeleton-heading'
      aria-busy>
      <h2
        id='table-skeleton-heading'
        className={styles.storyHeading}>
        Loading records
      </h2>
      <TableSkeleton
        rows={8}
        columns={5}
      />
    </section>
  ),
};
