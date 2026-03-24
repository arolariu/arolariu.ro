import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {TableSkeleton} from "./table-skeleton";

const meta = {
  title: "Components/Feedback/TableSkeleton",
  component: TableSkeleton,
  tags: ["autodocs"],
  argTypes: {
    rows: {
      control: {type: "range", min: 1, max: 20, step: 1},
      description: "Number of body rows rendered beneath the table header placeholders",
    },
    columns: {
      control: {type: "range", min: 1, max: 10, step: 1},
      description: "Number of columns rendered for both the header and body rows",
    },
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

/**
 * Table skeleton in a container.
 */
export const InContainer: Story = {
  render: () => (
    <div style={{padding: "1.5rem", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600"}}>Data Table</h3>
      <TableSkeleton
        rows={8}
        columns={5}
        aria-label='Loading invoices table'
      />
    </div>
  ),
};
