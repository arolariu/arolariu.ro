import {Menu as BaseMenu} from "@base-ui/react/menu";
import {Menubar as BaseMenubar} from "@base-ui/react/menubar";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it} from "vitest";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

function renderMenubar(): HTMLElement {
  render(
    <Menubar
      className='custom-root'
      data-testid='menubar-root'>
      <MenubarMenu>
        <MenubarTrigger className='custom-trigger'>File</MenubarTrigger>
        <MenubarContent
          className='custom-content'
          data-testid='file-menu'>
          <MenubarItem>New tab</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );

  return screen.getByRole("menuitem", {name: "File"});
}

describe("Menubar", () => {
  it("keeps explicit menus inside an element-render Menubar", () => {
    render(
      <Menubar render={<nav>Ignored content</nav>}>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Rename</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole("menubar")).toContainElement(screen.getByRole("menuitem", {name: "File"}));
    expect(screen.queryByText("Ignored content")).not.toBeInTheDocument();
  });

  it("passes actual Root and Trigger state, refs, events and children to function renders", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLDivElement>();
    const triggerRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const events: string[] = [];
    render(
      <Menubar
        ref={rootRef}
        aria-label='Application menus'
        className={(state) => (state.hasSubmenuOpen ? "root-open" : "root-closed")}
        render={(props, state) => (
          <nav
            {...props}
            data-root-open={state.hasSubmenuOpen}
            data-orientation={state.orientation}
          />
        )}>
        <MenubarMenu>
          <MenubarTrigger
            ref={triggerRef}
            className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
            onClick={() => events.push("wrapper")}
            render={(props, state) => (
              <button
                {...props}
                ref={(node) => {
                  childRef.current = node;
                  if (typeof props.ref === "function") return props.ref(node);
                  if (props.ref) props.ref.current = node;
                }}
                data-trigger-open={state.open}
              />
            )}>
            File
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Rename</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const root = screen.getByRole("menubar", {name: "Application menus"});
    const trigger = screen.getByRole("menuitem", {name: "File"});
    expect(rootRef.current).toBe(root);
    expect(triggerRef.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger.querySelector("button")).toBeNull();
    expect(trigger).toHaveAttribute("type", "button");
    expect(root).toHaveAttribute("data-root-open", "false");
    await user.click(trigger);
    expect(events).toEqual(["wrapper"]);
    expect(trigger).toHaveClass("trigger-open");
    expect(root).toHaveClass("root-open");
    expect(root).toHaveAttribute("data-root-open", "true");
  });

  it("retains Popup/Positioner/Portal callbacks and refs while reusing Dropdown content", () => {
    const ref = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    const portalRef = React.createRef<HTMLDivElement>();
    render(
      <Menubar>
        <MenubarMenu defaultOpen>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent
            ref={ref}
            aria-label='File actions'
            className={(state) => (state.open ? "popup-open" : "popup-closed")}
            render={(props, state) => (
              <section
                {...props}
                data-popup-open={state.open}
              />
            )}
            positionerProps={{
              ref: positionerRef,
              className: (state) => (state.open ? "positioner-open" : "positioner-closed"),
              render: (props) => (
                <div
                  {...props}
                  data-testid='positioner'
                />
              ),
            }}
            portalProps={{
              ref: portalRef,
              className: () => "portal-class",
              render: (props) => (
                <div
                  {...props}
                  data-testid='portal'
                />
              ),
            }}>
            <MenubarItem>Rename</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const popup = screen.getByRole("menu", {name: "File actions"});
    expect(ref.current).toBe(popup);
    expect(popup).toHaveClass("popup-open");
    expect(popup).toHaveAttribute("data-popup-open", "true");
    expect(positionerRef.current).toBe(screen.getByTestId("positioner"));
    expect(positionerRef.current).toHaveClass("positioner-open");
    expect(positionerRef.current).not.toHaveAttribute("aria-label");
    expect(portalRef.current).toBe(screen.getByTestId("portal"));
    expect(portalRef.current).toHaveClass("portal-class");
  });

  it("uses keyboard top-level navigation and skips disabled triggers", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger disabled>Disabled</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Unavailable</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Copy</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    await act(async () => {
      screen.getByRole("menuitem", {name: "File"}).focus();
    });
    await user.keyboard("{ArrowRight}");
    const edit = screen.getByRole("menuitem", {name: "Edit"});
    expect(edit).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", {name: "Copy"})).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(edit).toHaveFocus());
    fireEvent.click(screen.getByRole("menuitem", {name: "Disabled"}));
    expect(screen.queryByRole("menuitem", {name: "Unavailable"})).not.toBeInTheDocument();
  });

  it("keyboard-opens portaled submenus and Escape restores focus to both triggers", async () => {
    const user = userEvent.setup();
    const subRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent data-testid='overflow-parent'>
            <MenubarSub>
              <MenubarSubTrigger
                ref={subRef}
                className={(state) => (state.open ? "sub-open" : "sub-closed")}
                render={(props, state) => (
                  <div
                    {...props}
                    data-sub-open={state.open}
                  />
                )}>
                Share
              </MenubarSubTrigger>
              <MenubarSubContent
                ref={popupRef}
                aria-label='Share options'
                className={(state) => (state.nested ? "nested" : "root")}
                render={(props, state) => (
                  <div
                    {...props}
                    data-nested={state.nested}
                  />
                )}>
                <MenubarItem>Email</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    const rootTrigger = screen.getByRole("menuitem", {name: "File"});
    await act(async () => {
      rootTrigger.focus();
    });
    await user.keyboard("{ArrowDown}");
    const trigger = screen.getByRole("menuitem", {name: "Share"});
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.keyboard("{ArrowRight}");
    const popup = await screen.findByRole("menu", {name: "Share options"});
    expect(subRef.current).toBe(trigger);
    expect(popupRef.current).toBe(popup);
    expect(popup).toHaveClass("nested");
    expect(trigger).toHaveClass("sub-open");
    expect(screen.getByTestId("overflow-parent")).not.toContainElement(popup);
    expect(document.body).toContainElement(popup);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(rootTrigger).toHaveFocus());
  });

  it("supports controlled menu rerender and native cancellation details", async () => {
    const user = userEvent.setup();
    const view = (open: boolean): React.ReactElement => (
      <Menubar>
        <MenubarMenu
          open={open}
          onOpenChange={(_next, details) => details.cancel()}>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Rename</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
    const result = render(view(false));
    await user.click(screen.getByRole("menuitem", {name: "File"}));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    result.rerender(view(true));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    result.rerender(view(false));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("uses canonical variants and native checkbox/radio change details", async () => {
    const user = userEvent.setup();
    const details: string[] = [];
    render(
      <Menubar>
        <MenubarMenu defaultOpen>
          <MenubarTrigger>Options</MenubarTrigger>
          <MenubarContent>
            <MenubarItem variant='destructive'>Delete</MenubarItem>
            <MenubarCheckboxItem
              inset
              onCheckedChange={(checked, event) => details.push(`${checked}:${event.reason}`)}
              className={(state) => (state.checked ? "checked" : "unchecked")}
              render={(props) => <div {...props} />}>
              Toolbar
            </MenubarCheckboxItem>
            <MenubarRadioGroup
              defaultValue={null}
              onValueChange={(value: unknown, event) => details.push(`${String(value)}:${event.reason}`)}>
              <MenubarRadioItem
                inset
                value='light'
                className={(state) => (state.checked ? "checked" : "unchecked")}
                render={(props) => <div {...props} />}>
                Light
              </MenubarRadioItem>
              <MenubarRadioItem value={null}>None</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole("menuitem", {name: "Delete"})).toHaveAttribute("data-variant", "destructive");
    const checkbox = screen.getByRole("menuitemcheckbox", {name: "Toolbar"});
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("data-inset", "true");
    expect(checkbox).toHaveClass("checked");
    const radio = screen.getByRole("menuitemradio", {name: "Light"});
    await user.click(radio);
    expect(radio).toHaveAttribute("data-inset", "true");
    expect(radio).toHaveClass("checked");
    expect(details).toEqual(["true:item-press", "light:item-press"]);
  });

  it("preserves standalone Portal refs, group names and Popup/Root namespace types", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Menubar>
        <MenubarMenu defaultOpen>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarPortal ref={ref}>
            <span>Portal child</span>
          </MenubarPortal>
          <MenubarContent>
            <MenubarGroup>
              <MenubarLabel className={() => "label-class"}>Files</MenubarLabel>
              <MenubarItem>Rename</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator className={() => "separator-class"} />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(ref.current).toContainElement(screen.getByText("Portal child"));
    expect(screen.getByRole("group", {name: "Files"})).toBeInTheDocument();
    expect(screen.getByRole("separator")).toHaveClass("separator-class");
    expectTypeOf<Menubar.Props["render"]>().toEqualTypeOf<BaseMenubar.Props["render"]>();
    expectTypeOf<MenubarContent.Props["render"]>().toEqualTypeOf<BaseMenu.Popup.Props["render"]>();
    expectTypeOf<MenubarContent.Props["finalFocus"]>().toEqualTypeOf<BaseMenu.Popup.Props["finalFocus"]>();
    expectTypeOf<MenubarTrigger.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
  });

  it("names the role-bearing Menubar Popup", () => {
    render(
      <Menubar>
        <MenubarMenu defaultOpen>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent aria-label='File actions'>
            <MenubarItem>Rename</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    expect(screen.getByRole("menu", {name: "File actions"})).toBeInTheDocument();
  });

  it("renders the menubar structure, merges class names, and exposes accessibility attributes", () => {
    // Arrange
    const trigger = renderMenubar();

    // Assert
    expect(screen.getByRole("menubar")).toBeInTheDocument();
    expect(screen.getByTestId("menubar-root")).toHaveClass("custom-root");
    expect(trigger).toHaveClass("custom-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the menu content and renders child items when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const trigger = renderMenubar();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
    expect(screen.getByTestId("file-menu")).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", {name: "New tab"})).toBeVisible();
  });

  describe("MenubarCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show sidebar</MenubarCheckboxItem>
              <MenubarCheckboxItem checked={false}>Show toolbar</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "View"}));

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Show sidebar"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemcheckbox", {name: "Show toolbar"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Options</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                className='custom-checkbox'
                data-testid='checkbox-item'>
                Feature
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Options"}));

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });

    it("toggles checkbox item checked state on click", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                defaultChecked={false}
                data-testid='toggle-checkbox'>
                Toggle Feature
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "View"}));
      const checkboxItem = await screen.findByRole("menuitemcheckbox", {name: "Toggle Feature"});
      await user.click(checkboxItem);

      expect(checkboxItem).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("MenubarRadioGroup and MenubarRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup defaultValue='light'>
                <MenubarRadioItem value='light'>Light</MenubarRadioItem>
                <MenubarRadioItem value='dark'>Dark</MenubarRadioItem>
                <MenubarRadioItem value='system'>System</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Theme"}));

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Light"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemradio", {name: "Dark"})).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("menuitemradio", {name: "System"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Sort</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value='test'>
                <MenubarRadioItem
                  value='test'
                  className='custom-radio'
                  data-testid='radio-item'>
                  Test
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Sort"}));

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });

    it("selects radio item on click", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup defaultValue='light'>
                <MenubarRadioItem value='light'>Light</MenubarRadioItem>
                <MenubarRadioItem
                  value='dark'
                  data-testid='dark-radio'>
                  Dark
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Theme"}));
      const darkRadio = await screen.findByRole("menuitemradio", {name: "Dark"});
      await user.click(darkRadio);

      expect(darkRadio).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("MenubarSub, MenubarSubTrigger, and MenubarSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger>Advanced</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Transform</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByText("Undo")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Tools</MenubarTrigger>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger
                  className='custom-sub-trigger'
                  data-testid='sub-trigger'>
                  More
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Item</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Tools"}));

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("MenubarLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel>Recent Files</MenubarLabel>
                <MenubarItem>Document 1</MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));

      // Assert
      expect(await screen.findByText("Recent Files")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel
                  className='custom-label'
                  data-testid='menu-label'>
                  Actions
                </MenubarLabel>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });

    it("applies inset variants to labels, items, and submenu triggers", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Format</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel data-testid='plain-label'>Plain label</MenubarLabel>
                <MenubarLabel
                  inset
                  data-testid='inset-label'>
                  Inset label
                </MenubarLabel>
              </MenubarGroup>
              <MenubarItem data-testid='plain-item'>Plain item</MenubarItem>
              <MenubarItem
                inset
                data-testid='inset-item'>
                Inset item
              </MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger data-testid='plain-sub-trigger'>Plain submenu</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Plain submenu item</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSub>
                <MenubarSubTrigger
                  inset
                  data-testid='inset-sub-trigger'>
                  Inset submenu
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Inset submenu item</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Format"}));

      // Assert
      expect((await screen.findByTestId("inset-label")).className).not.toBe(screen.getByTestId("plain-label").className);
      expect(screen.getByTestId("inset-item").className).not.toBe(screen.getByTestId("plain-item").className);
      expect(screen.getByTestId("inset-sub-trigger").className).not.toBe(screen.getByTestId("plain-sub-trigger").className);
    });
  });

  describe("MenubarSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
              <MenubarSeparator data-testid='menu-separator' />
              <MenubarItem>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));
      await screen.findByText("New");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
    });
  });

  describe("MenubarShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Save
                <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));

      // Assert
      expect(await screen.findByText("⌘S")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Undo
                <MenubarShortcut
                  className='custom-shortcut'
                  data-testid='shortcut'>
                  ⌘Z
                </MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });

    it("supports rendering shortcuts as child elements", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Zoom in
                <MenubarShortcut asChild>
                  <span data-testid='shortcut-child'>⌘+</span>
                </MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "View"}));

      // Assert
      expect(await screen.findByTestId("shortcut-child")).toBeVisible();
      expect(screen.getByTestId("shortcut-child").querySelector("span")).toBeNull();
    });
  });
});
