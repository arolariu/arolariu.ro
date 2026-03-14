import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";

function renderNavigationMenu(): HTMLElement {
  render(
    <NavigationMenu
      className='custom-root'
      data-testid='navigation-root'>
      <NavigationMenuList data-testid='navigation-list'>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='custom-trigger'>Products</NavigationMenuTrigger>
          <NavigationMenuContent
            className='custom-content'
            data-testid='products-content'>
            <ul>
              <li>
                <NavigationMenuLink href='/analytics'>Analytics</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href='/pricing'
            className='custom-link'>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>,
  );

  return screen.getByRole("button", {name: /products/i});
}

describe("NavigationMenu", () => {
  it("renders the menu structure, merges class names, and exposes initial accessibility attributes", () => {
    // Arrange
    const trigger = renderNavigationMenu();

    // Assert
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("navigation-root")).toHaveClass("custom-root");
    expect(trigger).toHaveClass("custom-trigger");
    expect(screen.getByRole("link", {name: "Pricing"})).toHaveClass("custom-link");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the related content and renders children when the trigger is activated", async () => {
    // Arrange
    const user = userEvent.setup();
    const trigger = renderNavigationMenu();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("products-content")).toHaveClass("custom-content");
    expect(await screen.findByRole("link", {name: "Analytics"})).toHaveAttribute("href", "/analytics");
  });

  it("renders NavigationMenuLink with custom className", () => {
    // Arrange
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink
              href='/test'
              className='custom-link-class'
              data-testid='nav-link'>
              Test Link
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    // Assert
    const link = screen.getByTestId("nav-link");
    expect(link).toHaveClass("custom-link-class");
    expect(link).toHaveAttribute("href", "/test");
  });

  it("renders NavigationMenuViewport", () => {
    // Arrange
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>Content</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    // Assert
    // NavigationMenuViewport is rendered automatically by NavigationMenu
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders NavigationMenuIndicator with default children", () => {
    // Arrange
    render(
      <div>
        <NavigationMenuIndicator data-testid='nav-indicator' />
      </div>,
    );

    // Assert
    const indicator = screen.getByTestId("nav-indicator");
    expect(indicator).toBeInTheDocument();
  });

  it("renders NavigationMenuIndicator with asChild prop and valid element", () => {
    // Arrange
    render(
      <div>
        <NavigationMenuIndicator
          asChild
          data-testid='nav-indicator'>
          <span>Indicator</span>
        </NavigationMenuIndicator>
      </div>,
    );

    // Assert
    const indicator = screen.getByTestId("nav-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.tagName).toBe("SPAN");
    expect(screen.getByText("Indicator")).toBeInTheDocument();
  });

  it("renders NavigationMenuIndicator with custom children", () => {
    // Arrange
    render(
      <div>
        <NavigationMenuIndicator data-testid='nav-indicator'>Custom indicator content</NavigationMenuIndicator>
      </div>,
    );

    // Assert
    const indicator = screen.getByTestId("nav-indicator");
    expect(indicator).toBeInTheDocument();
    expect(screen.getByText("Custom indicator content")).toBeInTheDocument();
  });
});
