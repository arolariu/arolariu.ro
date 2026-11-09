"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./table";
const storyStyles = `
.ac-story-table-storyStriped :where(tbody > tr:nth-child(odd)) {
  background-color: var(--ac-muted);
}

.ac-story-table-storyCompact th,
.ac-story-table-storyCompact td {
  height: auto;
  padding: var(--ac-space-1) var(--ac-space-2);
}

.ac-story-table-storyScrollFrame {
  max-inline-size: 20rem;
}

.ac-story-table-storyWide {
  min-inline-size: 36rem;
}
`;

const storyClasses = {
  storyStriped: "ac-story-table-storyStriped",
  storyCompact: "ac-story-table-storyCompact",
  storyScrollFrame: "ac-story-table-storyScrollFrame",
  storyWide: "ac-story-table-storyWide",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Data Display/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {layout: "padded"},
} satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

const items = [
  {name: "Widget A", quantity: 5},
  {name: "Widget B", quantity: 3},
  {name: "Widget C", quantity: 2},
] as const;

function SampleTable({
  caption = false,
  footer = false,
  className,
}: Readonly<{caption?: boolean; footer?: boolean; className?: string}>): React.JSX.Element {
  return (
    <Table className={className}>
      {caption && <TableCaption>Items in the collection</TableCaption>}
      <TableHeader>
        <TableRow>
          <TableHead scope='col'>Item</TableHead>
          <TableHead scope='col'>Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.name}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.quantity}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {footer && (
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>10</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

export const Default: Story = {render: (): React.JSX.Element => <SampleTable />};
export const WithCaption: Story = {render: (): React.JSX.Element => <SampleTable caption />};
export const WithFooter: Story = {render: (): React.JSX.Element => <SampleTable footer />};
export const Striped: Story = {render: (): React.JSX.Element => <SampleTable className={storyClasses.storyStriped} />};
export const Compact: Story = {render: (): React.JSX.Element => <SampleTable className={storyClasses.storyCompact} />};

function ExpandableTable(): React.JSX.Element {
  const [expanded, setExpanded] = React.useState(false);
  const detailsId = React.useId();
  return (
    <Table>
      <TableCaption>A row highlights when its native control is expanded.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope='col'>Item</TableHead>
          <TableHead scope='col'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Widget A</TableCell>
          <TableCell>
            <Button
              size='sm'
              variant='outline'
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded(!expanded)}>
              {expanded ? "Hide details" : "Show details"}
            </Button>
          </TableCell>
        </TableRow>
        {expanded && (
          <TableRow id={detailsId}>
            <TableCell colSpan={2}>Five units are available.</TableCell>
          </TableRow>
        )}
        <TableRow data-state='selected'>
          <TableCell>Widget B</TableCell>
          <TableCell>Selected row</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
export const WithActions: Story = {render: (): React.JSX.Element => <ExpandableTable />};
export const ExpandedRows: Story = WithActions;

/**
 * The scroll viewport is a tab stop by default so keyboard users can scroll the overflowing columns. A region role
 * named from the caption makes that stop announceable; `containerProps={{tabIndex: -1}}` opts out for tables that
 * can never overflow.
 */
export const NamedScrollViewport: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyScrollFrame}>
      <Table
        className={storyClasses.storyWide}
        containerProps={{role: "region", "aria-labelledby": "table-story-stock-caption"}}>
        <TableCaption id='table-story-stock-caption'>Stock by warehouse</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope='col'>Item</TableHead>
            <TableHead scope='col'>Berlin</TableHead>
            <TableHead scope='col'>Bucharest</TableHead>
            <TableHead scope='col'>Lisbon</TableHead>
            <TableHead scope='col'>Oslo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.name}>
              <TableHead scope='row'>{item.name}</TableHead>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.quantity * 2}</TableCell>
              <TableCell>{item.quantity + 4}</TableCell>
              <TableCell>{item.quantity * 3}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

export const NativeAttributes: Story = {
  render: (): React.JSX.Element => (
    <Table
      cellPadding={4}
      cellSpacing={0}
      aria-label='Native table attribute example'
      dir='rtl'>
      <TableHeader>
        <TableRow>
          <TableHead
            id='native-name'
            scope='col'
            abbr='Item'>
            Item name
          </TableHead>
          <TableHead scope='col'>Quantity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell headers='native-name'>Widget</TableCell>
          <TableCell rowSpan={1}>5</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>One item</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
