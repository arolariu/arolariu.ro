import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {
  NavigationMenu,
  NavigationMenuContent,
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
});
