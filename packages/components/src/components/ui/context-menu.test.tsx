import {ContextMenu as BaseContextMenu} from "@base-ui/react/context-menu";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

function LegacyControl(props: Readonly<React.ComponentPropsWithRef<"button">>): React.ReactElement {
  return <button {...props} />;
}

function LegacyRegion(props: Readonly<React.ComponentPropsWithRef<"div">>): React.ReactElement {
  return <div {...props} />;
}

describe("ContextMenu", () => {
  it("does not normalize a closed pending popup render slot", () => {
    const normalize = vi.fn(() => {
      throw new Promise<void>(() => undefined);
    });
    const pending: React.ReactElement & Readonly<{$$typeof: symbol; _payload: null; _init: () => never}> = {
      ...(<div />),
      $$typeof: Symbol.for("react.lazy"),
      _payload: null,
      _init: normalize,
    };
    render(
      <React.Suspense fallback={<p>Pending context menu</p>}>
        <ContextMenu>
          <ContextMenuTrigger>Context target</ContextMenuTrigger>
          <ContextMenuContent render={pending}>
            <ContextMenuItem>Action</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </React.Suspense>,
    );
    expect(screen.getByText("Context target")).toBeVisible();
    expect(screen.queryByText("Pending context menu")).not.toBeInTheDocument();
    expect(normalize).not.toHaveBeenCalled();
  });

  it("retains explicit native-button mode and safe form semantics on the shared custom Item", async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error");
    const childRef = React.createRef<HTMLButtonElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    let submissions = 0;
    try {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Target</ContextMenuTrigger>
          <ContextMenuContent aria-label='Context actions'>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submissions += 1;
              }}>
              <ContextMenuItem
                nativeButton
                ref={wrapperRef}
                onClick={(event) => {
                  calls.push("wrapper");
                  event.preventBaseUIHandler();
                }}
                render={
                  <LegacyControl
                    ref={childRef}
                    onClick={() => calls.push("child")}>
                    Cancel close
                  </LegacyControl>
                }
              />
            </form>
          </ContextMenuContent>
        </ContextMenu>,
      );
      const item = screen.getByRole("menuitem", {name: "Cancel close"});
      expect(item.tagName).toBe("BUTTON");
      expect(item).toHaveAttribute("type", "button");
      expect(childRef.current).toBe(item);
      expect(wrapperRef.current).toBe(item);
      expect(item.querySelector("button")).toBeNull();
      await user.click(item);
      expect(calls).toEqual(["child", "wrapper"]);
      expect(submissions).toBe(0);
      expect(screen.getByRole("menu", {name: "Context actions"})).toBeInTheDocument();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("retains explicit non-native mode on the shared custom Context Item", async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error");
    try {
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Target</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              nativeButton={false}
              render={<LegacyRegion>Rename</LegacyRegion>}
            />
          </ContextMenuContent>
        </ContextMenu>,
      );
      const item = screen.getByRole("menuitem", {name: "Rename"});
      expect(item.tagName).toBe("DIV");
      await act(async () => {
        item.focus();
      });
      await user.keyboard("{Enter}");
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("routes Popup event handlers to the real menu rather than Positioner", async () => {
    const user = userEvent.setup();
    const targets: HTMLElement[] = [];
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Target</ContextMenuTrigger>
        <ContextMenuContent
          aria-label='Popup event target'
          onClick={(event) => {
            targets.push(event.currentTarget);
          }}>
          <ContextMenuItem onClick={(event) => event.preventBaseUIHandler()}>Cancel close</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Popup event target"});
    await user.click(screen.getByRole("menuitem", {name: "Cancel close"}));
    expect(targets).toEqual([popup]);
    expect(popup).toBeInTheDocument();
  });

  it("forwards real Context trigger, Popup, Positioner and Portal callbacks and refs", () => {
    const triggerRef = React.createRef<HTMLDivElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    const portalRef = React.createRef<HTMLDivElement>();
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger
          ref={triggerRef}
          className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
          render={(props, state) => (
            <section
              {...props}
              data-trigger-open={state.open}
            />
          )}>
          Target
        </ContextMenuTrigger>
        <ContextMenuContent
          ref={popupRef}
          aria-label='Context actions'
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
            render: (props, state) => (
              <div
                {...props}
                data-testid='positioner'
                data-positioner-open={state.open}
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
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Context actions"});
    expect(triggerRef.current).toBe(screen.getByText("Target"));
    expect(triggerRef.current).toHaveClass("trigger-open");
    expect(triggerRef.current).toHaveAttribute("data-trigger-open", "true");
    expect(popupRef.current).toBe(popup);
    expect(popup).toHaveClass("popup-open");
    expect(popup).toHaveAttribute("data-popup-open", "true");
    expect(positionerRef.current).toBe(screen.getByTestId("positioner"));
    expect(positionerRef.current).toHaveClass("positioner-open");
    expect(positionerRef.current).not.toHaveAttribute("aria-label");
    expect(portalRef.current).toBe(screen.getByTestId("portal"));
    expect(portalRef.current).toHaveClass("portal-class");
    expect(within(popup).getByRole("menuitem", {name: "Rename"})).toBeInTheDocument();
  });

  it("preserves explicit anatomy and child refs through element render composition", () => {
    const ref = React.createRef<HTMLDivElement>();
    const childRef = React.createRef<HTMLElement>();
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger render={<section>Ignored trigger</section>}>Target</ContextMenuTrigger>
        <ContextMenuContent
          ref={ref}
          aria-label='Context actions'
          render={<section ref={childRef}>Ignored popup</section>}
          positionerProps={{render: <div>Ignored positioner</div>}}
          portalProps={{render: <div>Ignored portal</div>}}>
          <ContextMenuCheckboxItem
            checked
            render={<div>Toolbar</div>}
          />
          <ContextMenuRadioGroup value='light'>
            <ContextMenuRadioItem
              value='light'
              render={<div>Light</div>}
            />
          </ContextMenuRadioGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger render={<div>Share</div>} />
            <ContextMenuSubContent>
              <ContextMenuItem>Email</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Context actions"});
    expect(ref.current).toBe(popup);
    expect(childRef.current).toBe(popup);
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.queryByText(/Ignored/)).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", {name: "Toolbar"}).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", {name: "Light"}).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitem", {name: "Share"}).querySelector("svg")).not.toBeNull();
  });

  it("honors trigger contextmenu cancellation and controlled root rerender", async () => {
    const user = userEvent.setup();
    const reasons: string[] = [];
    const view = (open: boolean): React.ReactElement => (
      <ContextMenu
        open={open}
        onOpenChange={(next, details) => {
          reasons.push(`${next}:${details.reason}`);
          details.cancel();
        }}>
        <ContextMenuTrigger onContextMenu={(event) => event.preventBaseUIHandler()}>Target</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    const result = render(view(false));
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Target")});
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(reasons).toEqual([]);
    result.rerender(view(true));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(reasons).toEqual(["false:escape-key"]);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    result.rerender(view(false));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("keyboard-opens a portaled submenu and returns focus after both Escape levels", async () => {
    const user = userEvent.setup();
    const finalFocus = React.createRef<HTMLButtonElement>();
    const subRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    render(
      <>
        <button
          type='button'
          ref={finalFocus}>
          Return here
        </button>
        <ContextMenu>
          <ContextMenuTrigger>Target</ContextMenuTrigger>
          <ContextMenuContent
            data-testid='overflow-parent'
            finalFocus={finalFocus}>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                ref={subRef}
                className={(state) => (state.open ? "sub-open" : "sub-closed")}
                render={(props, state) => (
                  <div
                    {...props}
                    data-sub-open={state.open}
                  />
                )}>
                Share
              </ContextMenuSubTrigger>
              <ContextMenuSubContent
                ref={popupRef}
                aria-label='Share options'
                className={(state) => (state.nested ? "nested" : "root")}
                render={(props, state) => (
                  <div
                    {...props}
                    data-nested={state.nested}
                  />
                )}>
                <ContextMenuItem>Email</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </>,
    );
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Target")});
    const trigger = screen.getByRole("menuitem", {name: "Share"});
    await act(async () => {
      trigger.focus();
    });
    await user.keyboard("{ArrowRight}");
    const popup = await screen.findByRole("menu", {name: "Share options"});
    expect(subRef.current).toBe(trigger);
    expect(popupRef.current).toBe(popup);
    expect(trigger).toHaveClass("sub-open");
    expect(popup).toHaveClass("nested");
    expect(screen.getByTestId("overflow-parent")).not.toContainElement(popup);
    expect(document.body).toContainElement(popup);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu", {name: "Share options"})).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(finalFocus.current).toHaveFocus());
  });

  it("keeps native checkbox/radio details, inset, destructive and disabled semantics", async () => {
    const user = userEvent.setup();
    const details: string[] = [];
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Target</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant='destructive'>Delete</ContextMenuItem>
          <ContextMenuItem
            disabled
            onClick={() => details.push("disabled")}>
            Unavailable
          </ContextMenuItem>
          <ContextMenuCheckboxItem
            inset
            onCheckedChange={(checked, event) => details.push(`${checked}:${event.reason}`)}
            className={(state) => (state.checked ? "checked" : "unchecked")}
            render={(props, state) => (
              <div
                {...props}
                data-checked={state.checked}
              />
            )}>
            Toolbar
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup
            defaultValue={null}
            onValueChange={(value: unknown, event) => details.push(`${String(value)}:${event.reason}`)}>
            <ContextMenuRadioItem
              inset
              value='light'
              className={(state) => (state.checked ? "checked" : "unchecked")}
              render={(props) => <div {...props} />}>
              Light
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value={null}>None</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.click(screen.getByRole("menuitem", {name: "Unavailable"}));
    expect(details).toEqual([]);
    expect(screen.getByRole("menuitem", {name: "Delete"})).toHaveAttribute("data-variant", "destructive");
    const checkbox = screen.getByRole("menuitemcheckbox", {name: "Toolbar"});
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("data-inset", "true");
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveClass("checked");
    const radio = screen.getByRole("menuitemradio", {name: "Light"});
    await user.click(radio);
    expect(radio).toHaveAttribute("data-inset", "true");
    expect(radio).toHaveClass("checked");
    expect(screen.getByRole("menuitemradio", {name: "None"})).toHaveAttribute("aria-checked", "false");
    expect(details).toEqual(["true:item-press", "light:item-press"]);
  });

  it("uses the enclosing Portal ref as submenu container outside the popup overflow owner", () => {
    const container = React.createRef<HTMLDivElement>();
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Target</ContextMenuTrigger>
        <ContextMenuContent
          data-testid='overflow-parent'
          portalProps={{ref: container}}>
          <ContextMenuSub defaultOpen>
            <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
            <ContextMenuSubContent
              aria-label='Share options'
              portalProps={{container}}
              collisionAvoidance={{side: "none", align: "none"}}>
              <ContextMenuItem>Email</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Share options"});
    expect(container.current).toContainElement(popup);
    expect(screen.getByTestId("overflow-parent")).not.toContainElement(popup);
    expect(popup).toHaveAttribute("data-side", "inline-end");
    expect(popup).toHaveAttribute("data-align", "start");
  });

  it("retains actual group naming, standalone Portal and precise Popup public types", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Target</ContextMenuTrigger>
        <ContextMenuPortal ref={ref}>
          <span>Portal child</span>
        </ContextMenuPortal>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuLabel
              className={() => "label-class"}
              render={(props) => <div {...props} />}>
              Files
            </ContextMenuLabel>
            <ContextMenuItem>Rename</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator className={() => "separator-class"} />
          <ContextMenuItem>
            Save<ContextMenuShortcut render={(props) => <span {...props} />}>Ctrl+S</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    expect(screen.getByRole("group", {name: "Files"})).toBeInTheDocument();
    expect(ref.current).toContainElement(screen.getByText("Portal child"));
    expect(screen.getByRole("separator")).toHaveClass("separator-class");
    expectTypeOf<ContextMenuContent.Props["render"]>().toEqualTypeOf<BaseContextMenu.Popup.Props["render"]>();
    expectTypeOf<ContextMenuContent.Props["finalFocus"]>().toEqualTypeOf<BaseContextMenu.Popup.Props["finalFocus"]>();
    expectTypeOf<ContextMenuCheckboxItem.Props["onCheckedChange"]>().toEqualTypeOf<BaseContextMenu.CheckboxItem.Props["onCheckedChange"]>();
  });

  it("names the role-bearing ContextMenu Popup", () => {
    render(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger>Actions</ContextMenuTrigger>
        <ContextMenuContent aria-label='Context actions'>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    expect(screen.getByRole("menu", {name: "Context actions"})).toBeInTheDocument();
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Assert
    expect(screen.getByText("Open context menu")).toBeInTheDocument();
  });

  it("opens the menu on contextmenu interaction", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

    // Assert
    expect(await screen.findByRole("menuitem", {name: "Rename"})).toBeInTheDocument();
    expect(screen.getByRole("menuitem", {name: "Delete"})).toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    // Act — Base UI Menu closes on Escape by default
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("merges the content className", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent className='custom-content'>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

    // Assert
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
  });

  it("renders item children inside the popup", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Child item content</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

    // Assert
    expect(await screen.findByText("Child item content")).toBeInTheDocument();
  });

  it("supports rendering trigger, items, and shortcuts as child elements", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger render={<button type='button'>Open context menu</button>} />
        <ContextMenuContent>
          <ContextMenuItem render={<span data-testid='child-item'>Child action</span>} />
          <ContextMenuItem>
            Copy
            <ContextMenuShortcut render={<span data-testid='shortcut-child'>⌘K</span>} />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.pointer({keys: "[MouseRight]", target: screen.getByRole("button", {name: "Open context menu"})});

    // Assert
    expect(await screen.findByTestId("child-item")).toBeVisible();
    expect(screen.getByTestId("child-item").tagName).toBe("SPAN");
    expect(screen.getByTestId("shortcut-child")).toBeVisible();
  });

  describe("ContextMenuCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Enabled</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem checked={false}>Disabled</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Enabled"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemcheckbox", {name: "Disabled"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem
              className='custom-checkbox'
              data-testid='checkbox-item'>
              Option
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });
  });

  describe("ContextMenuRadioGroup and ContextMenuRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value='option1'>
              <ContextMenuRadioItem value='option1'>Option 1</ContextMenuRadioItem>
              <ContextMenuRadioItem value='option2'>Option 2</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Option 1"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemradio", {name: "Option 2"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value='test'>
              <ContextMenuRadioItem
                value='test'
                className='custom-radio'
                data-testid='radio-item'>
                Test
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });
  });

  describe("ContextMenuSub, ContextMenuSubTrigger, and ContextMenuSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Top level</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More options</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Submenu item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByText("Top level")).toBeInTheDocument();
      expect(screen.getByText("More options")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                className='custom-sub-trigger'
                data-testid='sub-trigger'>
                Submenu
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("ContextMenuLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>Actions</ContextMenuLabel>
              <ContextMenuItem>Action 1</ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByText("Actions")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel
                className='custom-label'
                data-testid='menu-label'>
                Section
              </ContextMenuLabel>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });

    it("applies inset variants to labels, items, and submenu triggers", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel data-testid='plain-label'>Plain label</ContextMenuLabel>
              <ContextMenuLabel
                inset
                data-testid='inset-label'>
                Inset label
              </ContextMenuLabel>
            </ContextMenuGroup>
            <ContextMenuItem data-testid='plain-item'>Plain item</ContextMenuItem>
            <ContextMenuItem
              inset
              data-testid='inset-item'>
              Inset item
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger data-testid='plain-sub-trigger'>Plain submenu</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Plain submenu item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                inset
                data-testid='inset-sub-trigger'>
                Inset submenu
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Inset submenu item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect((await screen.findByTestId("inset-label")).className).not.toBe(screen.getByTestId("plain-label").className);
      expect(screen.getByTestId("inset-item").className).not.toBe(screen.getByTestId("plain-item").className);
      expect(screen.getByTestId("inset-sub-trigger").className).not.toBe(screen.getByTestId("plain-sub-trigger").className);
    });
  });

  describe("ContextMenuSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuSeparator
              className='custom-separator'
              data-testid='menu-separator'
            />
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});
      await screen.findByText("Item 1");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
      expect(screen.getByTestId("menu-separator")).toHaveClass("custom-separator");
    });
  });

  describe("ContextMenuShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByText("⌘C")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Paste
              <ContextMenuShortcut
                className='custom-shortcut'
                data-testid='shortcut'>
                ⌘V
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.pointer({keys: "[MouseRight]", target: screen.getByText("Open context menu")});

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });
  });
});
