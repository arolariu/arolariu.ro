import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./table.module.css";

/**
 * Props for the {@link Table} component.
 */
export type TableProps = Readonly<
  React.ComponentPropsWithRef<"table"> & {
    /**
     * Native props and `ref` for the scroll viewport `<div data-slot="table-container">`
     * that wraps the table. The viewport is a tab stop by default (`tabIndex={0}`)
     * so keyboard users can scroll a table wider than its container, and it shows
     * a focus ring. It has no role or name of its own: pass `role: "region"` with
     * `aria-labelledby` (for example the caption's `id`) or a localized
     * `aria-label` so the stop is announced. Opt out with `tabIndex: -1` only when
     * the table can never overflow. Caller values override these defaults and
     * `className` merges with the viewport class.
     */
    containerProps?: Omit<React.ComponentPropsWithRef<"div">, "children" | "dangerouslySetInnerHTML">;
  }
>;

/**
 * Props for the {@link TableHeader} component.
 */
export type TableHeaderProps = Readonly<React.ComponentPropsWithRef<"thead">>;

/**
 * Props for the {@link TableBody} component.
 */
export type TableBodyProps = Readonly<React.ComponentPropsWithRef<"tbody">>;

/**
 * Props for the {@link TableFooter} component.
 */
export type TableFooterProps = Readonly<React.ComponentPropsWithRef<"tfoot">>;

/**
 * Props for the {@link TableRow} component.
 */
export type TableRowProps = Readonly<React.ComponentPropsWithRef<"tr">>;

/**
 * Props for the {@link TableHead} component.
 */
export type TableHeadProps = Readonly<React.ComponentPropsWithRef<"th">>;

/**
 * Props for the {@link TableCell} component.
 */
export type TableCellProps = Readonly<React.ComponentPropsWithRef<"td">>;

/**
 * Props for the {@link TableCaption} component.
 */
export type TableCaptionProps = Readonly<React.ComponentPropsWithRef<"caption">>;

/**
 * Wraps a table in a horizontally scrollable container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<table>` element inside a `<div data-slot="table-container">`
 *   scroll viewport; `ref` targets the table, `containerProps.ref` the viewport.
 * - The viewport is a tab stop by default (`tabIndex={0}`, WCAG 2.1.1) so
 *   keyboard users can scroll overflowing columns; it shows a focus ring. Without
 *   a role it is an unnamed stop, so give it `role="region"` and a name through
 *   `containerProps` (usually `aria-labelledby` pointing at the caption).
 * - Opt out with `containerProps={{tabIndex: -1}}` only when the table can never
 *   overflow its container.
 * - Name the table itself with {@link TableCaption}, `aria-label` or
 *   `aria-labelledby`.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Table containerProps={{role: "region", "aria-labelledby": "invoices-caption"}}>
 *   <TableCaption id='invoices-caption'>Recent invoices</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead scope='col'>Invoice</TableHead>
 *       <TableHead scope='col'>Amount</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>INV-001</TableCell>
 *       <TableCell>$250.00</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 *
 * @see {@link TableProps} for available props
 */
const Table = ({ref, className, containerProps, ...props}: Readonly<TableProps>): React.JSX.Element => {
  const {className: containerClassName, ...containerNativeProps} = containerProps ?? {};
  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- This native overflow viewport needs keyboard-scroll focus, not an invented ARIA widget; caller attributes below retain their overrides.
      tabIndex={0}
      data-slot='table-container'
      className={cn(styles.container, containerClassName)}
      {...containerNativeProps}>
      <table
        ref={ref}
        data-slot='table'
        className={cn(styles.table, className)}
        {...props}
      />
    </div>
  );
};

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
const TableHeader = ({ref, className, ...props}: Readonly<TableHeaderProps>): React.JSX.Element => (
  <thead
    ref={ref}
    data-slot='table-header'
    className={cn(styles.header, className)}
    {...props}
  />
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
const TableBody = ({ref, className, ...props}: Readonly<TableBodyProps>): React.JSX.Element => (
  <tbody
    ref={ref}
    data-slot='table-body'
    className={cn(styles.body, className)}
    {...props}
  />
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
const TableFooter = ({ref, className, ...props}: Readonly<TableFooterProps>): React.JSX.Element => (
  <tfoot
    ref={ref}
    data-slot='table-footer'
    className={cn(styles.footer, className)}
    {...props}
  />
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
const TableRow = ({ref, className, ...props}: Readonly<TableRowProps>): React.JSX.Element => (
  <tr
    ref={ref}
    data-slot='table-row'
    className={cn(styles.row, className)}
    {...props}
  />
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
const TableHead = ({ref, className, ...props}: Readonly<TableHeadProps>): React.JSX.Element => (
  <th
    ref={ref}
    data-slot='table-head'
    className={cn(styles.head, className)}
    {...props}
  />
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
const TableCell = ({ref, className, ...props}: Readonly<TableCellProps>): React.JSX.Element => (
  <td
    ref={ref}
    data-slot='table-cell'
    className={cn(styles.cell, className)}
    {...props}
  />
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
const TableCaption = ({ref, className, ...props}: Readonly<TableCaptionProps>): React.JSX.Element => (
  <caption
    ref={ref}
    data-slot='table-caption'
    className={cn(styles.caption, className)}
    {...props}
  />
);

Table.displayName = "Table";
TableHeader.displayName = "TableHeader";
TableBody.displayName = "TableBody";
TableFooter.displayName = "TableFooter";
TableRow.displayName = "TableRow";
TableHead.displayName = "TableHead";
TableCell.displayName = "TableCell";
TableCaption.displayName = "TableCaption";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Table {
  export type Props = Readonly<TableProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableHeader {
  export type Props = Readonly<TableHeaderProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableBody {
  export type Props = Readonly<TableBodyProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableFooter {
  export type Props = Readonly<TableFooterProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableRow {
  export type Props = Readonly<TableRowProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableHead {
  export type Props = Readonly<TableHeadProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableCell {
  export type Props = Readonly<TableCellProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace TableCaption {
  export type Props = Readonly<TableCaptionProps>;
}

export {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow};
