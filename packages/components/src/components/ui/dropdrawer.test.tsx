import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useIsMobile} from "@/hooks/useIsMobile";

import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
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
});
