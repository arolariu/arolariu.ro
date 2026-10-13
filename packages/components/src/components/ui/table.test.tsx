import * as React from "react";

import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "./table";

describe("Table", () => {
  it("keeps native table attributes and refs on their actual nodes, including expandable row controls", () => {
    const table = React.createRef<HTMLTableElement>();
    const header = React.createRef<HTMLTableSectionElement>();
    const body = React.createRef<HTMLTableSectionElement>();
    const footer = React.createRef<HTMLTableSectionElement>();
    const row = React.createRef<HTMLTableRowElement>();
    const head = React.createRef<HTMLTableCellElement>();
    const cell = React.createRef<HTMLTableCellElement>();
    const caption = React.createRef<HTMLTableCaptionElement>();
    render(
      <Table
        ref={table}
        cellPadding={4}
        cellSpacing={0}
        aria-describedby='table-description'>
        <TableCaption
          ref={caption}
          id='table-description'>
          Library items
        </TableCaption>
        <TableHeader ref={header}>
          <TableRow>
            <TableHead
              ref={head}
              id='name'
              scope='col'
              abbr='Item'>
              Item name
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={body}>
          <TableRow
            ref={row}
            aria-expanded='true'
            data-state='selected'>
            <TableCell
              ref={cell}
              headers='name'
              colSpan={2}
              rowSpan={1}>
              <button
                type='button'
                aria-expanded='true'>
                Show details
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={footer}>
          <TableRow>
            <TableCell>Total: 1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(table.current).toHaveAttribute("cellpadding", "4");
    expect(table.current).toHaveAttribute("cellspacing", "0");
    expect(table.current?.parentElement).toHaveAttribute("data-slot", "table-container");
    expect(row.current).toHaveAttribute("data-slot", "table-row");
    expect(row.current).toHaveAttribute("aria-expanded", "true");
    expect(cell.current).toHaveAttribute("headers", "name");
    expect(cell.current).toHaveAttribute("colspan", "2");
    expect(head.current).toHaveAttribute("scope", "col");
    expect(head.current).toHaveAttribute("abbr", "Item");
    expect([
      table.current?.tagName,
      header.current?.tagName,
      body.current?.tagName,
      footer.current?.tagName,
      row.current?.tagName,
      head.current?.tagName,
      cell.current?.tagName,
      caption.current?.tagName,
    ]).toEqual(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION"]);
  });
  function renderTable(className?: string): void {
    render(
      <Table className={className}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
            <TableCell>Paid</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders headers, rows, and cells correctly", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByRole("columnheader", {name: "Name"})).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name: "Status"})).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Invoice #1"})).toBeInTheDocument();
    expect(screen.getByRole("cell", {name: "Paid"})).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("merges the table className", () => {
    // Arrange
    renderTable("custom-table");

    // Assert
    expect(screen.getByRole("table")).toHaveClass("custom-table");
  });

  it("renders child cell content", () => {
    // Arrange
    renderTable();

    // Assert
    expect(screen.getByText("Invoice #1")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders TableFooter with content", () => {
    // Arrange
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
            <TableCell>$100</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter data-testid='table-footer'>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$100</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    // Assert
    expect(screen.getByTestId("table-footer")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("renders TableCaption with content", () => {
    // Arrange
    render(
      <Table>
        <TableCaption data-testid='table-caption'>Recent invoices from the last 30 days</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Assert
    expect(screen.getByTestId("table-caption")).toBeInTheDocument();
    expect(screen.getByText("Recent invoices from the last 30 days")).toBeInTheDocument();
  });

  it("forwards ref to TableFooter", () => {
    // Arrange
    const ref = React.createRef<HTMLTableSectionElement>();

    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={ref}>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    expect(ref.current?.tagName).toBe("TFOOT");
  });

  it("forwards ref to TableCaption", () => {
    // Arrange
    const ref = React.createRef<HTMLTableCaptionElement>();

    render(
      <Table>
        <TableCaption ref={ref}>Caption text</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLTableCaptionElement);
    expect(ref.current?.tagName).toBe("CAPTION");
  });
});
