import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger} from "./drawer";

function renderDrawer({
  className,
  defaultOpen = false,
  customTrigger = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  customTrigger?: boolean;
}>) {
  return render(
    <Drawer defaultOpen={defaultOpen}>
      <DrawerTrigger render={customTrigger ? <button type='button'>Open drawer</button> : undefined}>
        {!customTrigger ? "Open drawer" : undefined}
      </DrawerTrigger>
      <DrawerContent
        className={className}
        data-testid='drawer-content'>
        <DrawerTitle>Drawer title</DrawerTitle>
        <DrawerDescription>Drawer description</DrawerDescription>
        <DrawerClose>Close drawer</DrawerClose>
      </DrawerContent>
    </Drawer>,
  );
}

describe("Drawer", () => {
  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderDrawer({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open drawer"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog", {name: "Drawer title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDrawer({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open drawer"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Drawer title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDrawer({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open drawer"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close drawer"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Drawer title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderDrawer({className: "custom-drawer-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("drawer-content")).toHaveClass("custom-drawer-content");
  });

  it("supports rendering a custom trigger element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDrawer({customTrigger: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open drawer"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Drawer title"})).toBeVisible();
  });

  it("exposes modal drawer accessibility semantics", async () => {
    // Arrange
    renderDrawer({defaultOpen: true});

    // Assert
    const drawer = await screen.findByRole("dialog", {name: "Drawer title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open drawer"});

    expect(drawer).toHaveAccessibleDescription("Drawer description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
