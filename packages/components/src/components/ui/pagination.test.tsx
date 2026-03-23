import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
  it("renders the pagination structure, merges class names, renders children, and exposes accessibility attributes", () => {
    // Arrange
    render(
      <Pagination
        className='custom-root'
        data-testid='pagination-root'>
        <PaginationContent data-testid='pagination-content'>
          <PaginationItem>
            <PaginationPrevious href='/?page=1' />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href='/?page=1'
              className='custom-link'>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href='/?page=2'
              isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis data-testid='pagination-ellipsis' />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href='/?page=3' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    // Assert
    expect(screen.getByRole("navigation", {name: /pagination/i})).toBeInTheDocument();
    expect(screen.getByTestId("pagination-root")).toHaveClass("custom-root");
    expect(screen.getByText("1")).toHaveClass("custom-link");
    expect(screen.getByRole("link", {name: "1"})).toHaveAttribute("href", "/?page=1");
    expect(screen.getByRole("link", {name: "2"})).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", {name: /go to previous page/i})).toHaveAttribute("href", "/?page=1");
    expect(screen.getByRole("link", {name: /go to next page/i})).toHaveAttribute("href", "/?page=3");
    expect(screen.getByTestId("pagination-ellipsis")).toHaveAttribute("aria-hidden", "true");
  });
});
