import {Menu as BaseMenu} from "@base-ui/react/menu";
import {DirectionProvider} from "@base-ui/react/direction-provider";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {Button} from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function LegacyControl(props: Readonly<React.ComponentPropsWithRef<"button">>): React.ReactElement {
  return <button {...props} />;
}

function LegacyLink(props: Readonly<React.ComponentPropsWithRef<"a">>): React.ReactElement {
  return <a {...props} />;
}

function LegacyRegion(props: Readonly<React.ComponentPropsWithRef<"div">>): React.ReactElement {
  return <div {...props} />;
}

function resolvedFlightRender(element: React.ReactElement): React.ReactElement {
  const transport = {
    ...element,
    $$typeof: Symbol.for("react.lazy"),
    _payload: element,
    _init: (payload: React.ReactElement): React.ReactElement => payload,
  };
  for (const field of ["props", "type", "key", "ref"]) Reflect.deleteProperty(transport, field);
  return transport;
}

describe("DropdownMenu", () => {
  it("refresh accessibility: authors keyboard focus independently of a low-contrast hover fill", () => {
    const css = readFileSync(join(import.meta.dirname, "dropdown-menu.module.css"), "utf8");
    expect(css).toMatch(/\.item:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ac-ring\)/u);
  });

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
      <React.Suspense fallback={<p>Pending menu</p>}>
        <DropdownMenu>
          <DropdownMenuTrigger>Open pending menu</DropdownMenuTrigger>
          <DropdownMenuContent render={pending}>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </React.Suspense>,
    );
    expect(screen.getByRole("button", {name: "Open pending menu"})).toBeVisible();
    expect(screen.queryByText("Pending menu")).not.toBeInTheDocument();
    expect(normalize).not.toHaveBeenCalled();
  });

  it.each(["custom", "library"] as const)(
    "preserves native type, form safety, state callbacks and refs for %s button composition",
    async (kind) => {
      const user = userEvent.setup();
      const errors = vi.spyOn(console, "error");
      const childRef = React.createRef<HTMLButtonElement>();
      const wrapperRef = React.createRef<HTMLElement>();
      const calls: string[] = [];
      let submissions = 0;
      try {
        render(
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submissions += 1;
            }}>
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={wrapperRef}
                className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
                onClick={() => calls.push("wrapper")}
                render={
                  kind === "custom" ? (
                    <LegacyControl
                      ref={childRef}
                      onClick={() => calls.push("child")}>
                      Actions
                    </LegacyControl>
                  ) : (
                    <Button
                      ref={childRef}
                      onClick={() => calls.push("child")}>
                      Actions
                    </Button>
                  )
                }
              />
              <DropdownMenuContent aria-label='Custom actions'>
                <DropdownMenuItem>Rename</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>,
        );
        const trigger = screen.getByRole("button", {name: "Actions"});
        expect(trigger.tagName).toBe("BUTTON");
        expect(trigger.querySelector("button")).toBeNull();
        expect(childRef.current).toBe(trigger);
        expect(wrapperRef.current).toBe(trigger);
        expect(trigger).toHaveClass("trigger-closed");
        await user.click(trigger);
        expect(calls).toEqual(["child", "wrapper"]);
        expect(submissions).toBe(0);
        expect(trigger).toHaveAttribute("type", "button");
        expect(trigger).not.toHaveAttribute("role");
        expect(screen.getByRole("menu", {name: "Custom actions"})).toBeInTheDocument();
        expect(trigger).toHaveClass("trigger-open");
        expect(errors).not.toHaveBeenCalled();
      } finally {
        errors.mockRestore();
      }
    },
  );

  it("retains custom native-button composition cancellation without submitting its form", async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error");
    const calls: string[] = [];
    const openChanges: boolean[] = [];
    let submissions = 0;
    try {
      render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submissions += 1;
          }}>
          <DropdownMenu onOpenChange={(open) => openChanges.push(open)}>
            <DropdownMenuTrigger
              onClick={() => calls.push("wrapper")}
              render={
                <LegacyControl
                  onMouseDown={(event) => {
                    if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
                  }}
                  onClick={() => calls.push("child")}>
                  Cancel open
                </LegacyControl>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem>Rename</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </form>,
      );
      const trigger = screen.getByRole("button", {name: "Cancel open"});
      await user.click(trigger);
      expect(calls).toEqual(["child", "wrapper"]);
      expect(submissions).toBe(0);
      expect(trigger).toHaveAttribute("type", "button");
      expect(openChanges).toEqual([]);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it.each(["anchor", "div"] as const)("keeps a custom non-native %s consumer explicit nativeButton=false", async (kind) => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error");
    const ref = React.createRef<HTMLElement>();
    try {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger
            ref={ref}
            nativeButton={false}
            render={kind === "anchor" ? <LegacyLink href='#actions'>Custom target</LegacyLink> : <LegacyRegion>Custom target</LegacyRegion>}
          />
          <DropdownMenuContent aria-label='Custom target actions'>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
      const trigger = screen.getByRole("button", {name: "Custom target"});
      expect(trigger.tagName).toBe(kind === "anchor" ? "A" : "DIV");
      expect(ref.current).toBe(trigger);
      expect(trigger).not.toHaveAttribute("type");
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard("{Enter}");
      expect(await screen.findByRole("menu", {name: "Custom target actions"})).toBeInTheDocument();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it.each(["anchor", "div"] as const)("still infers non-native mode only for the known intrinsic %s legacy target", async (kind) => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error");
    try {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={kind === "anchor" ? <a href='#actions'>Intrinsic target</a> : <div>Intrinsic target</div>}
          />
          <DropdownMenuContent>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
      const trigger = screen.getByRole("button", {name: "Intrinsic target"});
      expect(trigger.tagName).toBe(kind === "anchor" ? "A" : "DIV");
      expect(trigger).not.toHaveAttribute("type");
      await user.click(trigger);
      expect(await screen.findByRole("menu")).toBeInTheDocument();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("routes Popup events to the role-bearing element and retains item cancellation", async () => {
    const user = userEvent.setup();
    const targets: HTMLElement[] = [];
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label='Popup event target'
          onClick={(event) => {
            targets.push(event.currentTarget);
          }}>
          <DropdownMenuItem onClick={(event) => event.preventBaseUIHandler()}>Cancel close</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Popup event target"});
    await user.click(screen.getByRole("menuitem", {name: "Cancel close"}));
    expect(targets).toEqual([popup]);
    expect(popup).toBeInTheDocument();
  });

  it("keeps explicit label and shortcut children when replacing their elements", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel render={<div>Ignored label</div>}>Files</DropdownMenuLabel>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut render={<kbd>Ignored shortcut</kbd>}>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("group", {name: "Files"})).toBeInTheDocument();
    expect(screen.getByText("Ctrl+S").tagName).toBe("KBD");
    expect(screen.queryByText(/Ignored/)).not.toBeInTheDocument();
  });

  it("keeps the polymorphic trigger ref stable and forwards React callback cleanup", () => {
    const events: string[] = [];
    const triggerRef: React.RefCallback<HTMLElement> = (node) => {
      if (!node) return;
      events.push("mount");
      return () => {
        events.push("cleanup");
      };
    };
    const view = (open: boolean): React.ReactElement => (
      <DropdownMenu open={open}>
        <DropdownMenuTrigger ref={triggerRef}>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const result = render(view(false));
    const original = screen.getByRole("button", {name: "Actions"});
    result.rerender(view(true));
    expect(screen.getByRole("button", {name: "Actions"})).toBe(original);
    expect(events).toEqual(["mount"]);
    result.unmount();
    expect(events).toEqual(["mount", "cleanup"]);
  });

  it("retains controlled checkbox and radio values through rerenders, including null", () => {
    const view = (checked: boolean, value: string | null): React.ReactElement => (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={checked}>Toolbar</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={value}>
            <DropdownMenuRadioItem value='light'>Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={null}>None</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const result = render(view(false, null));
    expect(screen.getByRole("menuitemcheckbox", {name: "Toolbar"})).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", {name: "None"})).toHaveAttribute("aria-checked", "true");
    result.rerender(view(true, "light"));
    expect(screen.getByRole("menuitemcheckbox", {name: "Toolbar"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", {name: "Light"})).toHaveAttribute("aria-checked", "true");
    result.rerender(view(false, null));
    expect(screen.getByRole("menuitemradio", {name: "None"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", {name: "Light"})).toHaveAttribute("aria-checked", "false");
  });

  it("forwards function positioning offsets and an explicit native button type", async () => {
    const user = userEvent.setup();
    const placements: string[] = [];
    render(
      <DropdownMenu>
        <DropdownMenuTrigger type='submit'>Actions</DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label='Positioned menu'
          side='top'
          align='end'
          collisionAvoidance={{side: "none", align: "none"}}
          sideOffset={({side, align}) => {
            placements.push(`${side}:${align}`);
            return 4;
          }}
          alignOffset={({side}) => {
            placements.push(side);
            return 2;
          }}>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", {name: "Actions"})).toHaveAttribute("type", "submit");
    await user.click(screen.getByRole("button", {name: "Actions"}));
    await waitFor(() => expect(placements).toContain("top:end"));
    expect(placements).toContain("top");
    expect(screen.getByRole("menu", {name: "Positioned menu"})).toHaveAttribute("data-align", "end");
  });

  it("keeps explicit anatomy inside element-render Portal, Positioner, Popup and items", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger render={<button>Ignored trigger</button>}>Actions</DropdownMenuTrigger>
        <DropdownMenuContent
          aria-label='Actions'
          render={resolvedFlightRender(<section>Ignored popup</section>)}
          positionerProps={{render: resolvedFlightRender(<div>Ignored positioner</div>)}}
          portalProps={{render: resolvedFlightRender(<div>Ignored portal</div>)}}>
          <DropdownMenuItem render={resolvedFlightRender(<div>Ignored item</div>)}>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", {name: "Actions"})).toBeInTheDocument();
    expect(within(screen.getByRole("menu", {name: "Actions"})).getByRole("menuitem", {name: "Rename"})).toBeInTheDocument();
    expect(screen.queryByText(/Ignored/)).not.toBeInTheDocument();
  });

  it("passes actual Popup, Positioner and Portal state and refs to render callbacks", () => {
    const popupRef = React.createRef<HTMLDivElement>();
    const positionerRef = React.createRef<HTMLDivElement>();
    const portalRef = React.createRef<HTMLDivElement>();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent
          ref={popupRef}
          aria-label='Custom popup'
          side='top'
          align='end'
          collisionAvoidance={{side: "none", align: "none"}}
          className={(state) => (state.open ? "popup-open" : "popup-closed")}
          render={(props, state) => (
            <section
              {...props}
              data-popup-open={state.open}
              data-popup-nested={state.nested}
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
                data-anchor-hidden={state.anchorHidden}
              />
            ),
          }}
          portalProps={{
            ref: portalRef,
            className: () => "portal-class",
            render: (props, state) => (
              <div
                {...props}
                data-testid='portal'
                data-portal-state={Object.keys(state).length}
              />
            ),
          }}>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const popup = screen.getByRole("menu", {name: "Custom popup"});
    expect(popupRef.current).toBe(popup);
    expect(positionerRef.current).toBe(screen.getByTestId("positioner"));
    expect(portalRef.current).toBe(screen.getByTestId("portal"));
    expect(popup).toHaveAttribute("data-popup-open", "true");
    expect(popup).toHaveAttribute("data-popup-nested", "false");
    expect(popup).toHaveClass("popup-open");
    expect(screen.getByTestId("positioner")).toHaveClass("positioner-open");
    expect(screen.getByTestId("positioner")).toHaveAttribute("data-positioner-open", "true");
    expect(screen.getByTestId("positioner")).not.toHaveAttribute("aria-label");
    expect(screen.getByTestId("portal")).toHaveClass("portal-class");
    expect(screen.getByTestId("portal")).toHaveAttribute("data-portal-state", "0");
    expect(popup).toHaveAttribute("data-side", "top");
    expect(popup).toHaveAttribute("data-align", "end");
  });

  it("preserves generic root payload children and typed trigger refs", async () => {
    const user = userEvent.setup();
    const handle = BaseMenu.createHandle<{readonly name: string}>();
    const triggerRef = React.createRef<HTMLElement>();
    render(
      <>
        <DropdownMenuTrigger
          ref={triggerRef}
          handle={handle}
          payload={{name: "Payload action"}}>
          External
        </DropdownMenuTrigger>
        <DropdownMenu handle={handle}>
          {({payload}) => (
            <DropdownMenuContent aria-label='Payload menu'>
              <DropdownMenuItem>{payload?.name}</DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </>,
    );
    expect(triggerRef.current).toBe(screen.getByRole("button", {name: "External"}));
    await user.click(screen.getByRole("button", {name: "External"}));
    expect(screen.getByRole("menuitem", {name: "Payload action"})).toBeInTheDocument();
  });

  it("supports controlled rerender and cancellable root open details", async () => {
    const user = userEvent.setup();
    const reasons: string[] = [];
    const view = (open: boolean): React.ReactElement => (
      <DropdownMenu
        open={open}
        onOpenChange={(next, details) => {
          reasons.push(`${next}:${details.reason}`);
          details.cancel();
        }}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const result = render(view(false));
    await user.click(screen.getByRole("button", {name: "Actions"}));
    expect(reasons).toEqual(["true:trigger-press"]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    result.rerender(view(true));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(reasons).toContain("false:escape-key");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    result.rerender(view(false));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("merges child and wrapper trigger refs and respects child event cancellation", async () => {
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLButtonElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    render(
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={wrapperRef}
          onClick={() => calls.push("wrapper")}
          render={
            <button
              type='button'
              ref={childRef}
              onMouseDown={(event) => {
                if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
              }}
              onClick={(event) => {
                calls.push("child");
                event.preventDefault();
              }}>
              Cancel open
            </button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole("button", {name: "Cancel open"});
    expect(trigger).toHaveAttribute("type", "button");
    expect(trigger.querySelector("button")).toBeNull();
    expect(childRef.current).toBe(trigger);
    expect(wrapperRef.current).toBe(trigger);
    await user.click(trigger);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("honors primitive preventBaseUIHandler on non-native and disabled triggers", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton={false}
          render={<a href='#menu' />}
          onMouseDown={(event) => event.preventBaseUIHandler()}
          onClick={(event) => event.preventBaseUIHandler()}>
          Cancelled link
        </DropdownMenuTrigger>
        <DropdownMenuTrigger
          disabled
          nativeButton={false}
          render={<span />}>
          Disabled trigger
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", {name: "Cancelled link"}));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    const disabled = screen.getByRole("button", {name: "Disabled trigger"});
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(disabled);
    fireEvent.keyDown(disabled, {key: "Enter"});
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("returns focus to Popup finalFocus after Escape", async () => {
    const user = userEvent.setup();
    const finalFocus = React.createRef<HTMLButtonElement>();
    render(
      <>
        <button
          ref={finalFocus}
          type='button'>
          Return here
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent finalFocus={finalFocus}>
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
    );
    await user.click(screen.getByRole("button", {name: "Actions"}));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(finalFocus.current).toHaveFocus());
  });

  it.each(["ltr", "rtl"] as const)("opens a %s submenu by keyboard and Escape restores focus", async (direction) => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<HTMLElement>();
    const popupRef = React.createRef<HTMLDivElement>();
    render(
      <DirectionProvider direction={direction}>
        <div dir={direction}>
          <DropdownMenu>
            <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
            <DropdownMenuContent data-testid='parent-menu'>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  ref={triggerRef}
                  className={(state) => (state.open ? "sub-open" : "sub-closed")}
                  render={(props, state) => (
                    <div
                      {...props}
                      data-sub-open={state.open}
                    />
                  )}>
                  Share
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  ref={popupRef}
                  aria-label='Share options'
                  className={(state) => (state.nested ? "nested-popup" : "root-popup")}
                  render={(props, state) => (
                    <div
                      {...props}
                      data-nested={state.nested}
                    />
                  )}>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DirectionProvider>,
    );
    const rootTrigger = screen.getByRole("button", {name: "Actions"});
    await act(async () => {
      rootTrigger.focus();
    });
    await user.keyboard("{ArrowDown}");
    const subTrigger = screen.getByRole("menuitem", {name: "Share"});
    await waitFor(() => expect(subTrigger).toHaveFocus());
    expect(triggerRef.current).toBe(subTrigger);
    await user.keyboard(direction === "rtl" ? "{ArrowLeft}" : "{ArrowRight}");
    const submenu = await screen.findByRole("menu", {name: "Share options"});
    expect(popupRef.current).toBe(submenu);
    expect(submenu).toHaveAttribute("dir", direction);
    expect(subTrigger.querySelector("svg")).toHaveAttribute("data-direction", direction);
    expect(submenu).toHaveClass("nested-popup");
    expect(submenu).toHaveAttribute("data-nested", "true");
    expect(subTrigger).toHaveClass("sub-open");
    expect(screen.getByTestId("parent-menu")).not.toContainElement(submenu);
    await waitFor(() => expect(screen.getByRole("menuitem", {name: "Email"})).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu", {name: "Share options"})).not.toBeInTheDocument());
    expect(subTrigger).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(rootTrigger).toHaveFocus());
  });

  it("preserves native checkbox/radio state, null values, event details and cancellation", async () => {
    const user = userEvent.setup();
    const changes: string[] = [];
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            inset
            render={(props, state) => (
              <div
                {...props}
                data-checked={state.checked}
              />
            )}
            className={(state) => (state.checked ? "checked-class" : "unchecked-class")}
            onCheckedChange={(checked, details) => changes.push(`${checked}:${details.reason}:${details.event.type}`)}>
            Toolbar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem onCheckedChange={(_checked, details) => details.cancel()}>Cancelled check</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup
            defaultValue={null}
            onValueChange={(value: unknown, details) => changes.push(`${String(value)}:${details.reason}`)}>
            <DropdownMenuRadioItem
              inset
              value='light'
              render={(props, state) => (
                <div
                  {...props}
                  data-checked={state.checked}
                />
              )}
              className={(state) => (state.checked ? "selected-class" : "unselected-class")}>
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={null}>None</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const checkbox = screen.getByRole("menuitemcheckbox", {name: "Toolbar"});
    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveAttribute("data-checked", "true");
    expect(checkbox).toHaveClass("checked-class");
    expect(checkbox.querySelector("svg")).not.toBeNull();
    await user.click(screen.getByRole("menuitemcheckbox", {name: "Cancelled check"}));
    expect(screen.getByRole("menuitemcheckbox", {name: "Cancelled check"})).toHaveAttribute("aria-checked", "false");
    const radio = screen.getByRole("menuitemradio", {name: "Light"});
    await user.click(radio);
    expect(radio).toHaveAttribute("aria-checked", "true");
    expect(radio).toHaveClass("selected-class");
    expect(screen.getByRole("menuitemradio", {name: "None"})).toHaveAttribute("aria-checked", "false");
    expect(changes).toEqual(["true:item-press:click", "light:item-press"]);
  });

  it("keeps radio selection when native change details are cancelled", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            defaultValue={null}
            onValueChange={(_value: unknown, details) => details.cancel()}>
            <DropdownMenuRadioItem value={null}>None</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='light'>Light</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("menuitemradio", {name: "Light"}));
    expect(screen.getByRole("menuitemradio", {name: "None"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", {name: "Light"})).toHaveAttribute("aria-checked", "false");
  });

  it("retains item refs, element handlers and primitive item cancellation", async () => {
    const user = userEvent.setup();
    const wrapperRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const calls: string[] = [];
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            ref={wrapperRef}
            nativeButton
            className={(state) => (state.highlighted ? "highlighted-item" : "plain-item")}
            onClick={(event) => {
              calls.push("wrapper");
              event.preventBaseUIHandler();
            }}
            render={
              <button
                ref={childRef}
                type='button'
                onClick={() => calls.push("child")}
              />
            }>
            Cancel close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const item = screen.getByRole("menuitem", {name: "Cancel close"});
    expect(childRef.current).toBe(item);
    expect(wrapperRef.current).toBe(item);
    expect(item.querySelector("button")).toBeNull();
    await user.click(item);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("suppresses disabled item, checkbox, radio and submenu activation", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            disabled
            onClick={() => calls.push("item")}>
            Disabled item
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            disabled
            onCheckedChange={() => calls.push("checkbox")}>
            Disabled checkbox
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup onValueChange={() => calls.push("radio")}>
            <DropdownMenuRadioItem
              disabled
              value='disabled'>
              Disabled radio
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled>Disabled submenu</DropdownMenuSubTrigger>
            <DropdownMenuSubContent aria-label='Disabled popup'>
              <DropdownMenuItem>Nested item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    for (const name of ["Disabled item", "Disabled checkbox", "Disabled radio", "Disabled submenu"]) {
      const item = screen.getByText(name);
      expect(item).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(item);
      fireEvent.keyDown(item, {key: "Enter"});
    }
    await user.keyboard("{ArrowRight}");
    expect(calls).toEqual([]);
    expect(screen.queryByRole("menu", {name: "Disabled popup"})).not.toBeInTheDocument();
  });

  it("retains opaque Flight-lazy labels, compound adornments and inherited refs", () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLDivElement>();
    const transport = resolvedFlightRender(<div ref={childRef}>Toolbar</div>);
    expect(React.isValidElement(transport)).toBe(false);
    expect(transport).not.toHaveProperty("props");
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked
            ref={ref}
            render={transport}
          />
          <DropdownMenuRadioGroup value='light'>
            <DropdownMenuRadioItem
              value='light'
              render={resolvedFlightRender(<div>Light</div>)}
            />
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger render={resolvedFlightRender(<div>Share</div>)} />
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const checkbox = screen.getByRole("menuitemcheckbox", {name: "Toolbar"});
    expect(ref.current).toBe(checkbox);
    expect(childRef.current).toBe(checkbox);
    expect(checkbox.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", {name: "Light"}).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitem", {name: "Share"}).querySelector("svg")).not.toBeNull();
  });

  it("keeps real named groups, label/separator render state and shortcut refs", () => {
    const shortcutRef = React.createRef<HTMLSpanElement>();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel
              className={() => "label-class"}
              render={(props) => (
                <div
                  {...props}
                  data-testid='label'
                />
              )}>
              Files
            </DropdownMenuLabel>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut
                ref={shortcutRef}
                render={(props) => <span {...props} />}>
                Ctrl+S
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator
            className={(state) => `separator-${state.orientation}`}
            render={(props) => <hr {...props} />}
          />
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("group", {name: "Files"})).toBeInTheDocument();
    expect(screen.getByTestId("label")).toHaveClass("label-class");
    expect(screen.getByRole("separator")).toHaveClass("separator-horizontal");
    expect(shortcutRef.current).toBe(screen.getByText("Ctrl+S"));
  });

  it("renders standalone Portal into its requested container and forwards its ref", () => {
    const container = document.createElement("div");
    const ref = React.createRef<HTMLDivElement>();
    document.body.append(container);
    try {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuPortal
            ref={ref}
            container={container}>
            <span>Portaled child</span>
          </DropdownMenuPortal>
        </DropdownMenu>,
      );
      expect(container).toContainElement(screen.getByText("Portaled child"));
      expect(ref.current).toContainElement(screen.getByText("Portaled child"));
    } finally {
      container.remove();
    }
  });

  it("derives public callback/ref types from Popup rather than Positioner", () => {
    expectTypeOf<DropdownMenuContent.Props["render"]>().toEqualTypeOf<BaseMenu.Popup.Props["render"]>();
    expectTypeOf<DropdownMenuContent.Props["className"]>().toEqualTypeOf<BaseMenu.Popup.Props["className"]>();
    expectTypeOf<DropdownMenuContent.Props["finalFocus"]>().toEqualTypeOf<BaseMenu.Popup.Props["finalFocus"]>();
    expectTypeOf<DropdownMenuTrigger.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
    expectTypeOf<DropdownMenuCheckboxItem.Props["onCheckedChange"]>().toEqualTypeOf<BaseMenu.CheckboxItem.Props["onCheckedChange"]>();
  });

  it("names the role-bearing DropdownMenu Popup", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent aria-label='Invoice actions'>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("menu", {name: "Invoice actions"})).toBeInTheDocument();
  });

  it("passes primitive state to trigger render and class callbacks", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger
          className={(state) => (state.open ? "open-trigger" : "closed-trigger")}
          render={(props, state) => (
            <button
              {...props}
              data-open={state.open}
            />
          )}>
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("button", {name: "Actions"})).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("button", {name: "Actions"})).toHaveClass("open-trigger");
  });

  it("portals submenu content outside its overflow popup", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent data-testid='overflow-popup'>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent data-testid='submenu-popup'>
              <DropdownMenuItem>Email</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const submenu = screen.getByRole("menu", {name: "Share"});
    expect(screen.getByTestId("submenu-popup")).toBe(submenu);
    expect(screen.getByTestId("overflow-popup")).not.toContainElement(submenu);
    expect(document.body).toContainElement(submenu);
  });

  it("preserves render-element children when injecting indicators and submenu arrows", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked
            render={<div>Toolbar</div>}
          />
          <DropdownMenuRadioGroup value='light'>
            <DropdownMenuRadioItem
              value='light'
              render={<div>Light</div>}
            />
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger render={<div>Share</div>} />
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("menuitemcheckbox", {name: "Toolbar"}).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitemradio", {name: "Light"}).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("menuitem", {name: "Share"}).querySelector("svg")).not.toBeNull();
  });

  it("exposes canonical destructive and inset variants without leaking props", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant='destructive'>Delete</DropdownMenuItem>
          <DropdownMenuCheckboxItem inset>Toolbar</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value={null}>
            <DropdownMenuRadioItem
              inset
              value='light'>
              Light
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole("menuitem", {name: "Delete"})).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("menuitemcheckbox", {name: "Toolbar"})).toHaveAttribute("data-inset", "true");
    expect(screen.getByRole("menuitemradio", {name: "Light"})).toHaveAttribute("data-inset", "true");
    expect(screen.getByRole("menuitem", {name: "Delete"})).not.toHaveAttribute("variant");
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Open menu"})).toBeInTheDocument();
  });

  it("opens the menu when the trigger is clicked", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByRole("menuitem", {name: "Profile"})).toBeInTheDocument();
    expect(screen.getByRole("menuitem", {name: "Billing"})).toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", {name: "Open menu"}));
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
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent className='custom-content'>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
  });

  it("renders children inside menu items", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Nested child content</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByText("Nested child content")).toBeInTheDocument();
  });

  it("supports rendering trigger, items, and shortcuts as child elements", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type='button'>Open menu</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem render={<span data-testid='child-item'>Child action</span>} />
          <DropdownMenuItem>
            Copy
            <DropdownMenuShortcut render={<span data-testid='shortcut-child'>⌘K</span>} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByTestId("child-item")).toBeVisible();
    expect(screen.getByTestId("child-item").tagName).toBe("SPAN");
    expect(screen.getByTestId("shortcut-child")).toBeVisible();
  });

  describe("DropdownMenuCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>Show toolbar</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>Show sidebar</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Show toolbar"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemcheckbox", {name: "Show sidebar"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              className='custom-checkbox'
              data-testid='checkbox-item'>
              Feature
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });
  });

  describe("DropdownMenuRadioGroup and DropdownMenuRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value='light'>
              <DropdownMenuRadioItem value='light'>Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='dark'>Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='system'>System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Light"})).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("menuitemradio", {name: "Dark"})).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("menuitemradio", {name: "System"})).toHaveAttribute("aria-checked", "false");
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value='test'>
              <DropdownMenuRadioItem
                value='test'
                className='custom-radio'
                data-testid='radio-item'>
                Test
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });
  });

  describe("DropdownMenuSub, DropdownMenuSubTrigger, and DropdownMenuSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Advanced</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Developer tools</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                className='custom-sub-trigger'
                data-testid='sub-trigger'>
                More
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("DropdownMenuLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("My Account")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel
                className='custom-label'
                data-testid='menu-label'>
                Section
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });

    it("applies inset variants to labels, items, and submenu triggers", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel data-testid='plain-label'>Plain label</DropdownMenuLabel>
              <DropdownMenuLabel
                inset
                data-testid='inset-label'>
                Inset label
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem data-testid='plain-item'>Plain item</DropdownMenuItem>
            <DropdownMenuItem
              inset
              data-testid='inset-item'>
              Inset item
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid='plain-sub-trigger'>Plain submenu</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Plain submenu item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                inset
                data-testid='inset-sub-trigger'>
                Inset submenu
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Inset submenu item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect((await screen.findByTestId("inset-label")).className).not.toBe(screen.getByTestId("plain-label").className);
      expect(screen.getByTestId("inset-item").className).not.toBe(screen.getByTestId("plain-item").className);
      expect(screen.getByTestId("inset-sub-trigger").className).not.toBe(screen.getByTestId("plain-sub-trigger").className);
    });
  });

  describe("DropdownMenuSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator
              className='custom-separator'
              data-testid='menu-separator'
            />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));
      await screen.findByText("Item 1");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
      expect(screen.getByTestId("menu-separator")).toHaveClass("custom-separator");
    });
  });

  describe("DropdownMenuShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("⌘S")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Open
              <DropdownMenuShortcut
                className='custom-shortcut'
                data-testid='shortcut'>
                ⌘O
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });
  });
});
