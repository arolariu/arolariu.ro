import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "./table";

describe("Table", () => {
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
});
