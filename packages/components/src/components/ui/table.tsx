"use client";

/* eslint-disable react/prop-types */

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./table.module.css";

/**
 * Props for the {@link Table} component.
 */
export type TableProps = React.HTMLAttributes<HTMLTableElement>;

/**
 * Props for the {@link TableHeader} component.
 */
export type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;

/**
 * Props for the {@link TableBody} component.
 */
export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

/**
 * Props for the {@link TableFooter} component.
 */
export type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>;

/**
 * Props for the {@link TableRow} component.
 */
export type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;

/**
 * Props for the {@link TableHead} component.
 */
export type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;

/**
 * Props for the {@link TableCell} component.
 */
export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;

/**
 * Props for the {@link TableCaption} component.
 */
export type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

/**
 * Wraps a table in a horizontally scrollable container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<table>` element inside a `<div>` container
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader />
 * </Table>
 * ```
 *
 * @see {@link TableProps} for available props
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({className, ...props}: Readonly<TableProps>, ref): React.JSX.Element => (
    <div className={styles.container}>
      <table
        ref={ref}
        className={cn(styles.table, className)}
        {...props}
      />
    </div>
  ),
);

/**
 * Renders the table header section.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<thead>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableHeader>
 *   <TableRow />
 * </TableHeader>
 * ```
 *
 * @see {@link TableHeaderProps} for available props
 */
const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({className, ...props}: Readonly<TableHeaderProps>, ref): React.JSX.Element => (
    <thead
      ref={ref}
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);

/**
 * Renders the table body section.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<tbody>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableBody>
 *   <TableRow />
 * </TableBody>
 * ```
 *
 * @see {@link TableBodyProps} for available props
 */
const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({className, ...props}: Readonly<TableBodyProps>, ref): React.JSX.Element => (
    <tbody
      ref={ref}
      className={cn(styles.body, className)}
      {...props}
    />
  ),
);

/**
 * Renders the table footer section.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<tfoot>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableFooter>
 *   <TableRow />
 * </TableFooter>
 * ```
 *
 * @see {@link TableFooterProps} for available props
 */
const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({className, ...props}: Readonly<TableFooterProps>, ref): React.JSX.Element => (
    <tfoot
      ref={ref}
      className={cn(styles.footer, className)}
      {...props}
    />
  ),
);

/**
 * Renders a table row.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<tr>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableRow>
 *   <TableCell>Value</TableCell>
 * </TableRow>
 * ```
 *
 * @see {@link TableRowProps} for available props
 */
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({className, ...props}: Readonly<TableRowProps>, ref): React.JSX.Element => (
    <tr
      ref={ref}
      className={cn(styles.row, className)}
      {...props}
    />
  ),
);

/**
 * Renders a header cell.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<th>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableHead scope='col'>Name</TableHead>
 * ```
 *
 * @see {@link TableHeadProps} for available props
 */
const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({className, ...props}: Readonly<TableHeadProps>, ref): React.JSX.Element => (
    <th
      ref={ref}
      className={cn(styles.head, className)}
      {...props}
    />
  ),
);

/**
 * Renders a standard table cell.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<td>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableCell>Acme Inc.</TableCell>
 * ```
 *
 * @see {@link TableCellProps} for available props
 */
const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({className, ...props}: Readonly<TableCellProps>, ref): React.JSX.Element => (
    <td
      ref={ref}
      className={cn(styles.cell, className)}
      {...props}
    />
  ),
);

/**
 * Renders the table caption.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<caption>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <TableCaption>Recent invoices</TableCaption>
 * ```
 *
 * @see {@link TableCaptionProps} for available props
 */
const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({className, ...props}: Readonly<TableCaptionProps>, ref): React.JSX.Element => (
    <caption
      ref={ref}
      className={cn(styles.caption, className)}
      {...props}
    />
  ),
);

Table.displayName = "Table";
TableHeader.displayName = "TableHeader";
TableBody.displayName = "TableBody";
TableFooter.displayName = "TableFooter";
TableRow.displayName = "TableRow";
TableHead.displayName = "TableHead";
TableCell.displayName = "TableCell";
TableCaption.displayName = "TableCaption";

export {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow};
