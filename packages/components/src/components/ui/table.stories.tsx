"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./table";
import styles from "./table.module.css";

const meta = {title: "Components/Data Display/Table", component: Table, tags: ["autodocs"], parameters: {layout: "padded"}} satisfies Meta<
  typeof Table
>;
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
export const Striped: Story = {render: (): React.JSX.Element => <SampleTable className={styles.storyStriped} />};
export const Compact: Story = {render: (): React.JSX.Element => <SampleTable className={styles.storyCompact} />};

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
