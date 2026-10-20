import {fireEvent, render, screen} from "@testing-library/react";
import {createRef} from "react";
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
import buttonStyles from "./button.module.css";

const sizeCases = [
  ["default", buttonStyles.sizeDefault],
  ["xs", buttonStyles.sizeXs],
  ["sm", buttonStyles.sizeSm],
  ["lg", buttonStyles.sizeLg],
  ["icon", buttonStyles.sizeIcon],
  ["icon-xs", buttonStyles.sizeIconXs],
  ["icon-sm", buttonStyles.sizeIconSm],
  ["icon-lg", buttonStyles.sizeIconLg],
] as const;

describe("Pagination", () => {
  it("React 19 refresh: uses localized visible text as the default accessible name", () => {
    render(
      <>
        <PaginationPrevious
          href='/previous'
          text='Précédent'
        />
        <PaginationNext
          href='/next'
          text='Suivant'
        />
      </>,
    );
    expect(screen.getByRole("link", {name: "Précédent"})).toHaveAttribute("href", "/previous");
    expect(screen.getByRole("link", {name: "Suivant"})).toHaveAttribute("href", "/next");
  });

  it.each(sizeCases)("uses the reviewed %s Button sizing for a native pagination anchor", (size, className) => {
    if (className === undefined) throw new Error(`Missing Pagination ${size} Button CSS Module class`);
    render(
      <PaginationLink
        size={size}
        href='?page=4'>
        4
      </PaginationLink>,
    );
    expect(screen.getByRole("link", {name: "4"})).toHaveClass(className);
    expect(screen.getByRole("link", {name: "4"})).not.toHaveAttribute("type");
  });

  it("applies the documented size defaults: icon for page links, default for previous and next", () => {
    render(
      <>
        <PaginationLink href='?page=4'>4</PaginationLink>
        <PaginationPrevious href='?page=3' />
        <PaginationNext href='?page=5' />
      </>,
    );
    expect(screen.getByRole("link", {name: "4"})).toHaveClass(buttonStyles.sizeIcon!);
    expect(screen.getByRole("link", {name: "Previous"})).toHaveClass(buttonStyles.sizeDefault!);
    expect(screen.getByRole("link", {name: "Next"})).toHaveClass(buttonStyles.sizeDefault!);
    expect(screen.getByRole("link", {name: "Next"})).not.toHaveClass(buttonStyles.sizeIcon!);
  });

  it("keeps all native refs, active state, and caller cancellation on the actual navigation elements", () => {
    const root = createRef<HTMLElement>();
    const content = createRef<HTMLUListElement>();
    const item = createRef<HTMLLIElement>();
    const link = createRef<HTMLAnchorElement>();
    const previous = createRef<HTMLAnchorElement>();
    const next = createRef<HTMLAnchorElement>();
    const ellipsis = createRef<HTMLSpanElement>();
    const {rerender} = render(
      <Pagination ref={root}>
        <PaginationContent ref={content}>
          <PaginationItem ref={item}>
            <PaginationLink
              ref={link}
              href='?page=2'
              isActive
              onClick={(event) => event.preventDefault()}>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              ref={previous}
              href='?page=1'
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              ref={next}
              href='?page=3'
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis ref={ellipsis} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(link.current).toHaveAttribute("aria-current", "page");
    expect(link.current).toHaveAttribute("data-active", "true");
    expect(fireEvent.click(screen.getByRole("link", {name: "2"}))).toBe(false);
    expect([
      root.current?.tagName,
      content.current?.tagName,
      item.current?.tagName,
      link.current?.tagName,
      previous.current?.tagName,
      next.current?.tagName,
      ellipsis.current?.tagName,
    ]).toEqual(["NAV", "UL", "LI", "A", "A", "A", "SPAN"]);
    rerender(
      <PaginationLink
        ref={link}
        href='?page=2'>
        2
      </PaginationLink>,
    );
    expect(link.current).not.toHaveAttribute("aria-current");
    expect(link.current).toHaveAttribute("data-active", "false");
  });
  it("renders caller-visible localized navigation text while keeping accessible names overridable in RTL", () => {
    render(
      <Pagination
        dir='rtl'
        aria-label='Pages'>
        <PaginationPrevious
          href='?page=1'
          text='Précédent'
          aria-label='Page précédente'
        />
        <PaginationNext
          href='?page=3'
          text='Suivant'
          aria-label='Page suivante'
        />
      </Pagination>,
    );
    expect(screen.getByRole("link", {name: "Page précédente"})).toHaveTextContent("Précédent");
    expect(screen.getByRole("link", {name: "Page suivante"})).toHaveTextContent("Suivant");
    expect(screen.getByRole("navigation", {name: "Pages"})).toHaveAttribute("dir", "rtl");
  });
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
    expect(screen.getByRole("link", {name: "Previous"})).toHaveAttribute("href", "/?page=1");
    expect(screen.getByRole("link", {name: "Next"})).toHaveAttribute("href", "/?page=3");
    expect(screen.getByTestId("pagination-ellipsis")).toHaveAttribute("aria-hidden", "true");
  });
});
