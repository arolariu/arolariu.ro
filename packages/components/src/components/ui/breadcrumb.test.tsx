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
});
