"use client";

/* eslint-disable react/prop-types */

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./table.module.css";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableElement>>, ref): React.JSX.Element => (
    <div className={styles.container}>
      <table
        ref={ref}
        className={cn(styles.table, className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableSectionElement>>, ref): React.JSX.Element => (
    <thead
      ref={ref}
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableSectionElement>>, ref): React.JSX.Element => (
    <tbody
      ref={ref}
      className={cn(styles.body, className)}
      {...props}
    />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableSectionElement>>, ref): React.JSX.Element => (
    <tfoot
      ref={ref}
      className={cn(styles.footer, className)}
      {...props}
    />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableRowElement>>, ref): React.JSX.Element => (
    <tr
      ref={ref}
      className={cn(styles.row, className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({className, ...props}: Readonly<React.ThHTMLAttributes<HTMLTableCellElement>>, ref): React.JSX.Element => (
    <th
      ref={ref}
      className={cn(styles.head, className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({className, ...props}: Readonly<React.TdHTMLAttributes<HTMLTableCellElement>>, ref): React.JSX.Element => (
    <td
      ref={ref}
      className={cn(styles.cell, className)}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({className, ...props}: Readonly<React.HTMLAttributes<HTMLTableCaptionElement>>, ref): React.JSX.Element => (
    <caption
      ref={ref}
      className={cn(styles.caption, className)}
      {...props}
    />
  ),
);
TableCaption.displayName = "TableCaption";

export {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow};
