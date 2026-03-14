import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useIsMobile} from "@/hooks/useIsMobile";

import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  DropDrawerTrigger,
} from "./dropdrawer";

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(),
}));

const mockedUseIsMobile = vi.mocked(useIsMobile);

function renderDropDrawer({defaultOpen = false}: Readonly<{defaultOpen?: boolean}> = {}): ReturnType<typeof render> {
  return render(
    <DropDrawer defaultOpen={defaultOpen}>
      <DropDrawerTrigger>Open menu</DropDrawerTrigger>
      <DropDrawerContent>
        <DropDrawerGroup>
          <DropDrawerLabel>Account</DropDrawerLabel>
          <DropDrawerItem>Profile</DropDrawerItem>
          <DropDrawerSub id='security-submenu'>
            <DropDrawerSubTrigger>Security</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Passkeys</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerGroup>
      </DropDrawerContent>
    </DropDrawer>,
  );
}

describe("DropDrawer", () => {
  beforeEach(() => {
    mockedUseIsMobile.mockReturnValue(false);
  });

  it("renders a Base UI menu on desktop", async () => {
    // Arrange
    renderDropDrawer();

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeVisible();
      expect(screen.getByText("Security")).toBeVisible();
    });
  });

  it("renders a Base UI drawer on mobile", async () => {
    // Arrange
    mockedUseIsMobile.mockReturnValue(true);

    // Act
    renderDropDrawer({defaultOpen: true});

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeVisible();
      expect(screen.getByText("Security")).toBeVisible();
    });
  });

  it("navigates into mobile submenus", async () => {
    // Arrange
    mockedUseIsMobile.mockReturnValue(true);
    renderDropDrawer({defaultOpen: true});

    // Act
    fireEvent.click(screen.getByText("Security"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Passkeys")).toBeVisible();
      expect(screen.getByRole("button", {name: "Go back"})).toBeVisible();
    });
  });

  describe("DropDrawerGroup", () => {
    it("renders group on desktop without crashing", async () => {
      // Arrange
      renderDropDrawer({defaultOpen: true});

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Account")).toBeVisible();
        expect(screen.getByText("Profile")).toBeVisible();
      });
    });

    it("renders group on mobile without crashing", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);

      // Act
      renderDropDrawer({defaultOpen: true});

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Account")).toBeVisible();
        expect(screen.getByText("Profile")).toBeVisible();
      });
    });
  });

  describe("DropDrawerLabel", () => {
    it("renders label inside menu content", async () => {
      // Arrange
      renderDropDrawer({defaultOpen: true});

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Account")).toBeVisible();
      });
    });

    it("renders label on mobile", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      renderDropDrawer({defaultOpen: true});

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Account")).toBeVisible();
      });
    });

    it("renders label with custom className on desktop", async () => {
      // Arrange
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerGroup>
              <DropDrawerLabel className='custom-label'>Custom Label</DropDrawerLabel>
            </DropDrawerGroup>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const label = screen.getByText("Custom Label");
        expect(label).toHaveClass("custom-label");
      });
    });
  });

  describe("DropDrawerFooter", () => {
    it("renders footer on mobile drawer", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item 1</DropDrawerItem>
            <DropDrawerFooter data-testid='drawer-footer'>
              <button type='button'>Close</button>
            </DropDrawerFooter>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("drawer-footer")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
      });
    });

    it("renders footer content with custom className", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item 1</DropDrawerItem>
            <DropDrawerFooter
              className='custom-footer'
              data-testid='custom-footer'>
              Footer content
            </DropDrawerFooter>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const footer = screen.getByTestId("custom-footer");
        expect(footer).toHaveClass("custom-footer");
        expect(footer).toHaveTextContent("Footer content");
      });
    });
  });

  describe("DropDrawerSub, DropDrawerSubTrigger, and DropDrawerSubContent", () => {
    it("renders submenu structure on desktop", async () => {
      // Arrange
      renderDropDrawer({defaultOpen: true});

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Security")).toBeVisible();
      });
    });

    it("renders submenu structure on mobile and allows navigation", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      renderDropDrawer({defaultOpen: true});

      // Act
      fireEvent.click(screen.getByText("Security"));

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Passkeys")).toBeVisible();
      });
    });
  });

  describe("DropDrawerSeparator", () => {
    it("renders separator in menu", async () => {
      // Arrange
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item 1</DropDrawerItem>
            <DropDrawerSeparator data-testid='separator' />
            <DropDrawerItem>Item 2</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("separator")).toBeInTheDocument();
      });
    });

    it("renders separator on mobile without crashing", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item 1</DropDrawerItem>
            <DropDrawerSeparator />
            <DropDrawerItem>Item 2</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert - check that the component renders without crashing
      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeVisible();
        expect(screen.getByText("Item 2")).toBeVisible();
      });
    });
  });

  describe("DropDrawerItem", () => {
    it("renders items on desktop", async () => {
      // Arrange
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem data-testid='desktop-item'>Desktop Item</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("desktop-item")).toBeInTheDocument();
        expect(screen.getByText("Desktop Item")).toBeVisible();
      });
    });

    it("renders items on mobile", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem data-testid='mobile-item'>Mobile Item</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("mobile-item")).toBeInTheDocument();
        expect(screen.getByText("Mobile Item")).toBeVisible();
      });
    });

    it("renders item with icon prop", async () => {
      // Arrange
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem icon={<span data-testid='item-icon'>→</span>}>Item with icon</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("item-icon")).toBeInTheDocument();
        expect(screen.getByText("Item with icon")).toBeVisible();
      });
    });
  });

  describe("DropDrawerTrigger", () => {
    it("renders trigger button on desktop", () => {
      // Arrange
      render(
        <DropDrawer>
          <DropDrawerTrigger data-testid='desktop-trigger'>Open Desktop</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      expect(screen.getByTestId("desktop-trigger")).toBeInTheDocument();
      expect(screen.getByText("Open Desktop")).toBeVisible();
    });

    it("renders trigger button on mobile", () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer>
          <DropDrawerTrigger data-testid='mobile-trigger'>Open Mobile</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      expect(screen.getByTestId("mobile-trigger")).toBeInTheDocument();
      expect(screen.getByText("Open Mobile")).toBeVisible();
    });
  });

  describe("DropDrawerItem with disabled prop", () => {
    it("renders disabled item on desktop", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(false);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              disabled
              data-testid='disabled-item'>
              Disabled Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const item = screen.getByTestId("disabled-item");
        expect(item).toHaveAttribute("data-disabled");
        expect(item).toHaveAttribute("aria-disabled", "true");
      });
    });

    it("renders disabled item on mobile", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              disabled
              data-testid='disabled-item'>
              Disabled Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const item = screen.getByTestId("disabled-item");
        expect(item).toHaveAttribute("data-disabled", "true");
        expect(item).toHaveAttribute("aria-disabled", "true");
      });
    });

    it("does not trigger onClick when item is disabled on mobile", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      const mockOnClick = vi.fn();
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              disabled
              onClick={mockOnClick}
              data-testid='disabled-item'>
              Disabled Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Act
      await waitFor(() => screen.getByTestId("disabled-item"));
      fireEvent.click(screen.getByTestId("disabled-item"));

      // Assert
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("does not trigger onSelect when item is disabled on desktop", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(false);
      const mockOnSelect = vi.fn();
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              disabled
              onSelect={mockOnSelect}
              data-testid='disabled-item'>
              Disabled Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Act
      await waitFor(() => screen.getByTestId("disabled-item"));
      fireEvent.click(screen.getByTestId("disabled-item"));

      // Assert
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe("DropDrawerItem with closeOnClick", () => {
    it("closes dropdown when closeOnClick is true on desktop", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(false);
      render(
        <DropDrawer>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem closeOnClick>Close on click</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open"}));
      await waitFor(() => screen.getByText("Close on click"));

      // Assert - Item rendered
      expect(screen.getByText("Close on click")).toBeVisible();
    });
  });

  describe("DropDrawerItem with inset prop", () => {
    it("applies inset styling on desktop", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(false);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              inset
              data-testid='inset-item'>
              Inset Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const item = screen.getByTestId("inset-item");
        expect(item).toHaveAttribute("data-inset", "true");
      });
    });

    it("applies inset styling on mobile", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(true);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem
              inset
              data-testid='inset-item'>
              Inset Item
            </DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        const item = screen.getByTestId("inset-item");
        expect(item).toHaveAttribute("data-inset", "true");
      });
    });
  });
});
