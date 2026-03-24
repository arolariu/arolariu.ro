import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./empty";

const meta = {
  title: "Components/Feedback/Empty",
  component: Empty,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <svg
            className='h-12 w-12'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>We couldn&apos;t find any items matching your search. Try adjusting your filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

/**
 * Empty state with action button (CTA).
 */
function EmptyWithAction(): React.JSX.Element {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <svg
            style={{width: "48px", height: "48px"}}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 6v6m0 0v6m0-6h6m-6 0H6'
            />
          </svg>
        </EmptyMedia>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>Get started by creating your first item.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create Item</Button>
      </EmptyContent>
    </Empty>
  );
}

export const WithAction: Story = {
  render: () => <EmptyWithAction />,
};

/**
 * Minimal empty state without header (compact variant).
 */
function CompactEmpty(): React.JSX.Element {
  return (
    <Empty>
      <EmptyContent style={{paddingTop: "32px"}}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          textAlign: "center",
        }}>
          <svg
            style={{width: "32px", height: "32px", color: "#9ca3af"}}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
            />
          </svg>
          <p style={{fontSize: "14px", color: "#6b7280", margin: 0}}>
            No data available
          </p>
        </div>
      </EmptyContent>
    </Empty>
  );
}

export const Compact: Story = {
  render: () => <CompactEmpty />,
};
