import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

describe("Breadcrumb", () => {
  it("renders the breadcrumb structure, merges class names, renders children, and exposes accessibility attributes", () => {
    // Arrange
    render(
      <Breadcrumb
        className='custom-root'
        data-testid='breadcrumb-root'>
        <BreadcrumbList
          className='custom-list'
          data-testid='breadcrumb-list'>
          <BreadcrumbItem className='custom-item'>
            <BreadcrumbLink
              href='/dashboard'
              className='custom-link'>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator
            className='custom-separator'
            data-testid='breadcrumb-separator'>
            /
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage
              className='custom-page'
              data-testid='breadcrumb-page'>
              Settings
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid='breadcrumb-ellipsis' />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("navigation", {name: /breadcrumb/i})).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-root")).toHaveClass("custom-root");
    expect(screen.getByTestId("breadcrumb-list")).toHaveClass("custom-list");
    expect(screen.getByText("Dashboard").closest("a")).toHaveClass("custom-link");
    expect(screen.getByText("Dashboard").closest("li")).toHaveClass("custom-item");
    expect(screen.getByTestId("breadcrumb-separator")).toHaveClass("custom-separator");
    expect(screen.getByTestId("breadcrumb-page")).toHaveClass("custom-page");
    expect(screen.getByRole("link", {name: "Dashboard"})).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Settings")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("breadcrumb-ellipsis")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders BreadcrumbLink with href", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/home'>Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByRole("link", {name: "Home"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
  });

  it("renders BreadcrumbPage as current page", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Current Page</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const page = screen.getByText("Current Page");
    expect(page).toBeInTheDocument();
    expect(page).toHaveAttribute("role", "link");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveAttribute("aria-disabled", "true");
  });

  it("renders BreadcrumbEllipsis with default icon", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid='ellipsis' />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const ellipsis = screen.getByTestId("ellipsis");
    expect(ellipsis).toBeInTheDocument();
    expect(ellipsis).toHaveAttribute("role", "presentation");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders BreadcrumbSeparator with custom separator", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid='custom-separator'>→</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const separator = screen.getByTestId("custom-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveTextContent("→");
    expect(separator).toHaveAttribute("role", "presentation");
    expect(separator).toHaveAttribute("aria-hidden", "true");
  });

  it("renders BreadcrumbSeparator with default ChevronRight icon when no children", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid='default-separator' />
          <BreadcrumbItem>
            <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const separator = screen.getByTestId("default-separator");
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("role", "presentation");
  });

  it("renders BreadcrumbLink with asChild prop and custom element", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              href='/dashboard'>
              <a
                className='custom-child-link'
                data-testid='child-link'>
                Dashboard
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByTestId("child-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass("custom-child-link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders BreadcrumbLink without asChild uses anchor tag", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href='/about'
              data-testid='standard-link'>
              About
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByTestId("standard-link");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/about");
  });

  it("merges className from child element when using asChild", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className='parent-class'>
              <a
                className='child-class'
                href='/link'>
                Link
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    const link = screen.getByRole("link", {name: "Link"});
    expect(link).toHaveClass("parent-class");
    expect(link).toHaveClass("child-class");
  });

  it("renders multiple breadcrumb items in sequence", () => {
    // Arrange & Act
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'>Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/category'>Category</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href='/subcategory'>Subcategory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("link", {name: "Home"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Category"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Subcategory"})).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("applies custom className to all breadcrumb components", () => {
    // Arrange & Act
    render(
      <Breadcrumb className='custom-breadcrumb'>
        <BreadcrumbList className='custom-list'>
          <BreadcrumbItem className='custom-item'>
            <BreadcrumbLink
              className='custom-link'
              href='/'>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className='custom-separator' />
          <BreadcrumbItem className='custom-item-2'>
            <BreadcrumbPage className='custom-page'>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // Assert
    expect(screen.getByRole("navigation")).toHaveClass("custom-breadcrumb");
    expect(screen.getByRole("list")).toHaveClass("custom-list");
    expect(screen.getByRole("link", {name: "Home"})).toHaveClass("custom-link");
    expect(screen.getByText("Current")).toHaveClass("custom-page");
  });
});
