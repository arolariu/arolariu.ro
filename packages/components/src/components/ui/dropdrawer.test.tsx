import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeVisible();
      expect(screen.getByText("Security")).toBeVisible();
    });
  });

  it("navigates into mobile submenus", async () => {
    // Arrange
    mockedUseIsMobile.mockReturnValue(true);
    renderDropDrawer({defaultOpen: true});

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByText("Security"));

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

    it("renders footer content on desktop", async () => {
      // Arrange
      mockedUseIsMobile.mockReturnValue(false);
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Item 1</DropDrawerItem>
            <DropDrawerFooter data-testid='desktop-footer'>Footer content</DropDrawerFooter>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("desktop-footer")).toHaveTextContent("Footer content");
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
      const user = userEvent.setup();
    await user.click(screen.getByText("Security"));

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Passkeys")).toBeVisible();
      });
    });

    it("opens submenu on desktop hover", async () => {
      // Arrange
      renderDropDrawer({defaultOpen: true});

      // Act - hover over submenu trigger
      await waitFor(() => screen.getByText("Security"));
      const securityTrigger = screen.getByText("Security");
      const user = userEvent.setup();
    await user.hover(securityTrigger);

      // Assert - submenu content should become visible
      await waitFor(() => {
        expect(screen.getByText("Passkeys")).toBeInTheDocument();
      });
    });

    it("renders chevron icon in submenu trigger on desktop", async () => {
      // Arrange
      renderDropDrawer({defaultOpen: true});

      // Assert - should have chevron icon
      await waitFor(() => {
        const securityTrigger = screen.getByText("Security").parentElement;
        expect(securityTrigger).toBeInTheDocument();
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
            <DropDrawerSeparator data-testid='mobile-separator' />
            <DropDrawerItem>Item 2</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>,
      );

      // Assert - check that the component renders without crashing
      await waitFor(() => {
        expect(screen.getByText("Item 1")).toBeVisible();
        expect(screen.getByText("Item 2")).toBeVisible();
        expect(screen.queryByTestId("mobile-separator")).not.toBeInTheDocument();
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
      const user = userEvent.setup();
    await user.click(screen.getByTestId("disabled-item"));

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
      const user = userEvent.setup();
    await user.click(screen.getByTestId("disabled-item"));

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
      const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open"}));
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

describe("DropDrawerItem - onSelect callback", () => {
  beforeEach(() => {
    mockedUseIsMobile.mockReturnValue(false);
  });

  it("calls onSelect when desktop item is clicked", async () => {
    const mockOnSelect = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onSelect={mockOnSelect}
            data-testid='item-with-select'>
            Item
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByTestId("item-with-select"));
    const user = userEvent.setup();
    await user.click(screen.getByTestId("item-with-select"));

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it("calls onSelect when mobile item is clicked", async () => {
    mockedUseIsMobile.mockReturnValue(true);
    const mockOnSelect = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onSelect={mockOnSelect}
            data-testid='item-with-select'>
            Item
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByTestId("item-with-select"));
    const user = userEvent.setup();
    await user.click(screen.getByTestId("item-with-select"));

    expect(mockOnSelect).toHaveBeenCalled();
  });
});

describe("DropDrawerCheckboxItem and DropDrawerRadioGroup", () => {
  it("renders checkbox items on desktop", async () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem data-testid='checkbox-item'>Checkbox Item</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("checkbox-item")).toBeInTheDocument();
    });
  });
});

describe("DropDrawerSubTrigger with onClick", () => {
  it("calls onClick handler when desktop subtrigger is clicked", async () => {
    mockedUseIsMobile.mockReturnValue(false);
    const mockOnClick = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='test-submenu'>
            <DropDrawerSubTrigger onClick={mockOnClick}>Sub</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Sub Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByText("Sub"));
    const user = userEvent.setup();
    await user.click(screen.getByText("Sub"));

    expect(mockOnClick).toHaveBeenCalled();
  });

  it("calls onClick handler and navigates when mobile subtrigger is clicked", async () => {
    mockedUseIsMobile.mockReturnValue(true);
    const mockOnClick = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='test-submenu'>
            <DropDrawerSubTrigger onClick={mockOnClick}>Sub</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Sub Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByText("Sub"));
    const user = userEvent.setup();
    await user.click(screen.getByText("Sub"));

    expect(mockOnClick).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Sub Item")).toBeVisible();
    });
  });
});

describe("DropDrawerSubTrigger keyboard navigation", () => {
  it("navigates on Enter key press on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='keyboard-submenu'>
            <DropDrawerSubTrigger>Keyboard Sub</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Keyboard Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByText("Keyboard Sub"));
    const trigger = screen.getByText("Keyboard Sub");

    const user = userEvent.setup();
    trigger.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Keyboard Item")).toBeVisible();
    });
  });

  it("navigates on Space key press on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='space-submenu'>
            <DropDrawerSubTrigger>Space Sub</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Space Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByText("Space Sub"));
    const trigger = screen.getByText("Space Sub");

    const user = userEvent.setup();
    trigger.focus();
    await user.keyboard(" ");

    await waitFor(() => {
      expect(screen.getByText("Space Item")).toBeVisible();
    });
  });

  it("ignores non-activation keys on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='ignored-key-submenu'>
            <DropDrawerSubTrigger>Ignored Key Sub</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Ignored Key Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    const trigger = await screen.findByText("Ignored Key Sub");
    const user = userEvent.setup();

    trigger.focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.queryByText("Ignored Key Item")).not.toBeInTheDocument();
  });

  it("navigates using the parent submenu id fallback on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSubTrigger data-parent-submenu-id='fallback-submenu'>Fallback Sub</DropDrawerSubTrigger>
          <DropDrawerSub id='fallback-submenu'>
            <DropDrawerSubContent>
              <DropDrawerItem>Fallback Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByText("Fallback Sub"));

    await waitFor(() => {
      expect(screen.getByText("Fallback Item")).toBeVisible();
    });
  });

  it("does not navigate when a mobile subtrigger cannot resolve a submenu id", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSubTrigger>Orphan Sub</DropDrawerSubTrigger>
        </DropDrawerContent>
      </DropDrawer>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByText("Orphan Sub"));

    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });
});

describe("DropDrawerItem keyboard navigation", () => {
  it("triggers click on Enter key press on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);
    const mockOnClick = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onClick={mockOnClick}
            data-testid='keyboard-item'>
            Keyboard Item
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByTestId("keyboard-item"));
    const item = screen.getByTestId("keyboard-item");

    const user = userEvent.setup();
    item.focus();
    await user.keyboard("{Enter}");

    expect(mockOnClick).toHaveBeenCalled();
  });

  it("triggers click on Space key press on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);
    const mockOnClick = vi.fn();

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onClick={mockOnClick}
            data-testid='space-item'>
            Space Item
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => screen.getByTestId("space-item"));
    const item = screen.getByTestId("space-item");

    const user = userEvent.setup();
    item.focus();
    await user.keyboard(" ");

    expect(mockOnClick).toHaveBeenCalled();
  });
});

describe("DropDrawer back navigation", () => {
  it("navigates back from nested submenu on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Main Item</DropDrawerItem>
          <DropDrawerSub id='nested-submenu'>
            <DropDrawerSubTrigger>Nested</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Nested Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    // Navigate into submenu
    const user = userEvent.setup();
    await waitFor(() => screen.getByText("Nested"));
    await user.click(screen.getByText("Nested"));

    await waitFor(() => screen.getByText("Nested Item"));

    // Navigate back
    const backButton = screen.getByRole("button", {name: "Go back"});
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText("Main Item")).toBeVisible();
    });
  });
});

describe("DropDrawerFooter on desktop", () => {
  it("renders footer content on desktop", async () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Item</DropDrawerItem>
          <DropDrawerFooter data-testid='desktop-footer'>Desktop Footer</DropDrawerFooter>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("desktop-footer")).toBeInTheDocument();
      expect(screen.getByText("Desktop Footer")).toBeVisible();
    });
  });
});

describe("DropDrawerTrigger with asChild", () => {
  it("renders trigger with asChild on desktop", () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <DropDrawer>
        <DropDrawerTrigger asChild>
          <button
            type='button'
            data-testid='custom-trigger'>
            Custom Trigger
          </button>
        </DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Item</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
  });

  it("renders trigger with asChild on mobile", () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer>
        <DropDrawerTrigger asChild>
          <button
            type='button'
            data-testid='custom-mobile-trigger'>
            Custom Mobile Trigger
          </button>
        </DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Item</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );

    expect(screen.getByTestId("custom-mobile-trigger")).toBeInTheDocument();
  });
});

describe("DropDrawerSubTrigger with inset", () => {
  it("applies inset styling to subtrigger on desktop", async () => {
    mockedUseIsMobile.mockReturnValue(false);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='inset-submenu'>
            <DropDrawerSubTrigger
              inset
              data-testid='inset-trigger'>
              Inset Sub
            </DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Sub Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => {
      const trigger = screen.getByTestId("inset-trigger");
      expect(trigger).toHaveAttribute("data-inset", "true");
    });
  });

  it("applies inset styling to subtrigger on mobile", async () => {
    mockedUseIsMobile.mockReturnValue(true);

    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub id='mobile-inset-submenu'>
            <DropDrawerSubTrigger
              inset
              data-testid='mobile-inset-trigger'>
              Mobile Inset Sub
            </DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Sub Item</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );

    await waitFor(() => {
      const trigger = screen.getByTestId("mobile-inset-trigger");
      expect(trigger).toHaveAttribute("data-inset", "true");
    });
  });
});
