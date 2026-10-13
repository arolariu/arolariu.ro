import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {Menu as BaseMenu} from "@base-ui/react/menu";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {hydrateRoot, type Root} from "react-dom/client";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

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

/** Only matchMedia is replaced: both responsive hooks and both SDK owners remain real. */
function installMediaQuery(initialMobile = false): {change: (mobile: boolean) => void; restore: () => void} {
  let mobile = initialMobile;
  const queries = new Map<string, MediaQueryList>();
  const legacyListeners = new Map<MediaQueryList, Set<(this: MediaQueryList, event: MediaQueryListEvent) => void>>();
  const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value(query: string): MediaQueryList {
      const existing = queries.get(query);
      if (existing) return existing;
      const target = new EventTarget();
      const list: MediaQueryList = {
        get matches() {
          return query === "(max-width: 767px)" && mobile;
        },
        media: query,
        onchange: null,
        addListener: (listener) => {
          if (listener) legacyListeners.get(list)?.add(listener);
        },
        removeListener: (listener) => {
          if (listener) legacyListeners.get(list)?.delete(listener);
        },
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        dispatchEvent: target.dispatchEvent.bind(target),
      };
      queries.set(query, list);
      legacyListeners.set(list, new Set());
      return list;
    },
  });
  return {
    change(nextMobile) {
      mobile = nextMobile;
      act(() => {
        for (const list of queries.values()) {
          const event = Object.assign(new Event("change"), {matches: list.matches, media: list.media});
          list.dispatchEvent(event);
          list.onchange?.call(list, event);
          for (const listener of legacyListeners.get(list) ?? []) listener.call(list, event);
        }
      });
    },
    restore() {
      if (original) Object.defineProperty(window, "matchMedia", original);
      else Reflect.deleteProperty(window, "matchMedia");
    },
  };
}

function Navigation({version = "Passkeys", submenu = true}: Readonly<{version?: string; submenu?: boolean}>): React.ReactElement {
  return (
    <>
      <DropDrawerGroup>
        <DropDrawerLabel>Account</DropDrawerLabel>
        <DropDrawerItem closeOnClick={false}>Profile</DropDrawerItem>
        {submenu && (
          <div>
            <DropDrawerSub id='security'>
              <DropDrawerSubTrigger>Security</DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem closeOnClick={false}>{version}</DropDrawerItem>
                <DropDrawerSub>
                  <DropDrawerSubTrigger>Advanced</DropDrawerSubTrigger>
                  <DropDrawerSubContent>
                    <DropDrawerItem>Recovery</DropDrawerItem>
                  </DropDrawerSubContent>
                </DropDrawerSub>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </div>
        )}
      </DropDrawerGroup>
      <DropDrawerSeparator />
      <DropDrawerFooter>Session actions</DropDrawerFooter>
    </>
  );
}

function Fixture(props: Readonly<React.ComponentProps<typeof DropDrawer> & {version?: string; submenu?: boolean}>): React.ReactElement {
  const {version, submenu, ...rootProps} = props;
  return (
    <DropDrawer
      mobileTitle='Actions'
      {...rootProps}>
      <DropDrawerTrigger>Open actions</DropDrawerTrigger>
      <DropDrawerContent aria-label='Actions'>
        <Navigation
          version={version}
          submenu={submenu}
        />
      </DropDrawerContent>
    </DropDrawer>
  );
}

let media: ReturnType<typeof installMediaQuery>;
const bodyStyles = document.body.style.cssText;
const htmlStyles = document.documentElement.style.cssText;

beforeEach(() => {
  media = installMediaQuery();
});

afterEach(async () => {
  cleanup();
  await waitFor(() => {
    expect(document.body.style.cssText).toBe(bodyStyles);
    expect(document.documentElement.style.cssText).toBe(htmlStyles);
  });
  media.restore();
  vi.restoreAllMocks();
});

describe("DropDrawer real responsive owners", () => {
  it.each(["click", "Enter", "Space"] as const)(
    "suppresses disabled mobile submenu %s before navigation and callbacks",
    async (activation) => {
      media.change(true);
      const selections: string[] = [];
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open actions</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerSub>
              <DropDrawerSubTrigger
                disabled
                onClick={() => selections.push("click")}
                onKeyDown={() => selections.push("key")}>
                Disabled submenu
              </DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem>Forbidden destination</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>,
      );
      const trigger = await screen.findByText("Disabled submenu");
      const control = trigger.closest('[data-slot="drop-drawer-sub-trigger"]');
      if (!control) throw new Error("Missing submenu trigger");
      if (activation === "click") fireEvent.click(control);
      else {
        fireEvent.keyDown(control, {key: activation === "Enter" ? "Enter" : " "});
        fireEvent.keyUp(control, {key: activation === "Enter" ? "Enter" : " "});
      }
      expect(selections).toEqual([]);
      expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
      expect(screen.queryByRole("button", {name: "Forbidden destination"})).not.toBeInTheDocument();
      expect(control).toHaveAttribute("disabled");
      expect(control.tagName).toBe("BUTTON");
    },
  );

  it("owns real desktop roving navigation, submenu keyboard opening and escape", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", {name: "Open actions"});
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = await screen.findByRole("menu", {name: "Actions"});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(within(menu).getByRole("menuitem", {name: "Profile"})).toHaveFocus());
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(await screen.findByRole("menuitem", {name: "Passkeys"})).toBeVisible();
    await user.keyboard("{Escape}{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("uses ordinary native mobile buttons, labelled groups, a real viewport and no incomplete menu roles", async () => {
    media.change(true);
    render(<Fixture defaultOpen />);
    const dialog = await screen.findByRole("dialog", {name: "Actions"});
    expect(within(dialog).getByRole("button", {name: "Profile"}).tagName).toBe("BUTTON");
    expect(within(dialog).getByRole("group", {name: "Account"})).toBeVisible();
    expect(within(dialog).queryByRole("menuitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("separator")).not.toBeInTheDocument();
    expect(dialog.closest('[data-slot="drawer-viewport"]')).not.toBeNull();
    expect(within(dialog).getByText("Session actions")).toBeVisible();
  });

  it.each([false, true])("preserves %s uncontrolled opening across both breakpoint directions", async (defaultOpen) => {
    const requests: boolean[] = [];
    const user = userEvent.setup();
    render(
      <Fixture
        defaultOpen={defaultOpen}
        onOpenChange={(open) => requests.push(open)}
      />,
    );
    if (!defaultOpen) await user.click(screen.getByRole("button", {name: "Open actions"}));
    expect(await screen.findByRole("menu")).toBeVisible();
    const before = requests.length;
    media.change(true);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    media.change(false);
    expect(await screen.findByRole("menu")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests).toHaveLength(before);
  });

  it.each([false, true])("retains legacy matching engine handles without leaking them to the other owner on mobile=%s", async (mobile) => {
    media.change(mobile);
    const handle = mobile ? BaseDrawer.createHandle() : BaseMenu.createHandle();
    const user = userEvent.setup();
    render(
      <DropDrawer handle={handle}>
        <DropDrawerTrigger handle={handle}>Handled actions</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Handled action</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    await user.click(screen.getByRole("button", {name: "Handled actions"}));
    expect(await screen.findByRole(mobile ? "dialog" : "menu")).toBeVisible();
    media.change(!mobile);
    expect(await screen.findByRole(mobile ? "menu" : "dialog")).toBeVisible();
    expect(screen.getByText("Handled action")).toBeVisible();
  });

  it("keeps controlled requests cancellable and does not turn a declined request into owned state", async () => {
    const user = userEvent.setup();
    const requests: boolean[] = [];
    const view = render(
      <Fixture
        open={false}
        onOpenChange={(open) => requests.push(open)}
      />,
    );
    await user.click(screen.getByRole("button", {name: "Open actions"}));
    expect(requests).toEqual([true]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    view.rerender(
      <Fixture
        open
        onOpenChange={(open, details) => {
          requests.push(open);
          if (!open) details.cancel();
        }}
      />,
    );
    media.change(true);
    expect(await screen.findByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(requests).toEqual([true, false]);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("honors cancellation of an uncontrolled primitive close request", async () => {
    media.change(true);
    const user = userEvent.setup();
    render(
      <Fixture
        defaultOpen
        onOpenChange={(open, details) => {
          if (!open) details.cancel();
        }}
      />,
    );
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("hands focus to each new primitive during an open breakpoint migration", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await user.click(screen.getByRole("button", {name: "Open actions"}));
    await screen.findByRole("menu");
    media.change(true);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    media.change(false);
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
  });

  it("enters nested mobile panels, restores each trigger on back, and keeps generated IDs stable", async () => {
    media.change(true);
    const user = userEvent.setup();
    render(<Fixture defaultOpen />);
    await user.click(await screen.findByRole("button", {name: "Security"}));
    const passkeys = await screen.findByRole("button", {name: "Passkeys"});
    await waitFor(() => expect(passkeys).toHaveFocus());
    const advanced = screen.getByRole("button", {name: "Advanced"});
    const id = advanced.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    await user.click(advanced);
    await waitFor(() => expect(screen.getByRole("button", {name: "Recovery"})).toHaveFocus());
    await user.click(screen.getByRole("button", {name: "Go back"}));
    await waitFor(() => expect(advanced).toHaveFocus());
    expect(advanced).toHaveAttribute("aria-controls", id);
    await user.click(screen.getByRole("button", {name: "Go back"}));
    await waitFor(() => expect(screen.getByRole("button", {name: "Security"})).toHaveFocus());
    expect(screen.getByRole("button", {name: "Profile"})).toBeVisible();
  });

  it("keeps caller panel IDs and their trigger controls aligned through active rerenders", async () => {
    media.change(true);
    const user = userEvent.setup();
    const panelRef = React.createRef<HTMLElement>();
    function IdentifiedPanel({id}: Readonly<{id: string}>): React.ReactElement {
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerSub id='stable-submenu'>
              <DropDrawerSubTrigger>Identified panel</DropDrawerSubTrigger>
              <DropDrawerSubContent
                id={id}
                ref={panelRef}
                render={<section />}>
                <DropDrawerItem closeOnClick={false}>Identified action</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    const view = render(<IdentifiedPanel id='caller-panel' />);
    const trigger = await screen.findByRole("button", {name: "Identified panel"});
    expect(trigger).toHaveAttribute("aria-controls", "caller-panel");
    await user.click(trigger);
    expect(await screen.findByRole("button", {name: "Identified action"})).toBeVisible();
    expect(panelRef.current).toHaveAttribute("id", "caller-panel");
    view.rerender(<IdentifiedPanel id='updated-panel' />);
    expect(panelRef.current).toHaveAttribute("id", "updated-panel");
    expect(trigger).toHaveAttribute("aria-controls", "updated-panel");
    expect(screen.getByRole("button", {name: "Identified action"})).toBeVisible();
  });

  it("updates active registered children on rerender and resets removed submenu navigation", async () => {
    media.change(true);
    const user = userEvent.setup();
    const view = render(<Fixture defaultOpen />);
    await user.click(await screen.findByRole("button", {name: "Security"}));
    expect(await screen.findByRole("button", {name: "Passkeys"})).toBeVisible();
    view.rerender(
      <Fixture
        defaultOpen
        version='Updated action'
      />,
    );
    expect(await screen.findByRole("button", {name: "Updated action"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Passkeys"})).not.toBeInTheDocument();
    view.rerender(
      <Fixture
        defaultOpen
        submenu={false}
      />,
    );
    await waitFor(() => expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument());
    expect(screen.getByRole("button", {name: "Profile"})).toBeVisible();
  });

  it("unregisters a removed live panel without leaving an empty active page or navigating to stale content", async () => {
    media.change(true);
    const user = userEvent.setup();
    function ConditionalPanel({present}: Readonly<{present: boolean}>): React.ReactElement {
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem closeOnClick={false}>Main action</DropDrawerItem>
            <DropDrawerSub>
              <DropDrawerSubTrigger>Conditional panel</DropDrawerSubTrigger>
              {present && (
                <DropDrawerSubContent>
                  <DropDrawerItem>Conditional action</DropDrawerItem>
                </DropDrawerSubContent>
              )}
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    const view = render(<ConditionalPanel present />);
    await user.click(await screen.findByRole("button", {name: "Conditional panel"}));
    expect(await screen.findByRole("button", {name: "Conditional action"})).toBeVisible();
    view.rerender(<ConditionalPanel present={false} />);
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", {name: "Conditional panel"});
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Main action"})).toBeVisible();
  });

  it("resets drill-down on close/reopen and on breakpoint migration without losing root open state", async () => {
    media.change(true);
    const user = userEvent.setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", {name: "Open actions"});
    await user.click(trigger);
    await user.click(await screen.findByRole("button", {name: "Security"}));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.click(trigger);
    expect(await screen.findByRole("button", {name: "Profile"})).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Security"}));
    media.change(false);
    expect(await screen.findByRole("menu")).toBeVisible();
    media.change(true);
    expect(await screen.findByRole("button", {name: "Profile"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it.each([false, true])("applies closeOnClick false and true consistently on mobile=%s, including submenu actions", async (mobile) => {
    media.change(mobile);
    const user = userEvent.setup();
    render(<Fixture defaultOpen />);
    await user.click(await screen.findByRole(mobile ? "button" : "menuitem", {name: "Profile"}));
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
    const security = screen.getByRole(mobile ? "button" : "menuitem", {name: "Security"});
    if (mobile) await user.click(security);
    else {
      act(() => security.focus());
      await user.keyboard("{ArrowRight}");
    }
    await user.click(await screen.findByRole(mobile ? "button" : "menuitem", {name: "Passkeys"}));
    expect(screen.getByRole(mobile ? "dialog" : "menu", mobile ? undefined : {name: "Actions"})).toBeVisible();
    const advanced = screen.getByRole(mobile ? "button" : "menuitem", {name: "Advanced"});
    if (mobile) await user.click(advanced);
    else {
      act(() => advanced.focus());
      await user.keyboard("{ArrowRight}");
    }
    await user.click(await screen.findByRole(mobile ? "button" : "menuitem", {name: "Recovery"}));
    await waitFor(() => expect(screen.queryByRole(mobile ? "dialog" : "menu")).not.toBeInTheDocument());
  });

  it.each([false, true])("preserves click/selection cancellation and callback order on mobile=%s", async (mobile) => {
    media.change(mobile);
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open actions</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onClick={(event) => {
              calls.push("click");
              event.preventDefault();
            }}
            onSelect={() => calls.push("select")}>
            Cancel click
          </DropDrawerItem>
          <DropDrawerItem
            onClick={() => calls.push("click")}
            onSelect={(event) => {
              calls.push("select");
              event.preventDefault();
            }}>
            Cancel selection
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    await user.click(await screen.findByRole(mobile ? "button" : "menuitem", {name: "Cancel click"}));
    expect(calls).toEqual(["click"]);
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
    await user.click(screen.getByRole(mobile ? "button" : "menuitem", {name: "Cancel selection"}));
    expect(calls).toEqual(["click", "click", "select"]);
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
  });

  it.each([false, true])("honors SDK-only activation cancellation before selection on mobile=%s", async (mobile) => {
    media.change(mobile);
    const user = userEvent.setup();
    const selections: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            onClick={(event) => {
              event.preventBaseUIHandler();
            }}
            onSelect={() => selections.push("selected")}>
            Cancel SDK activation
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    await user.click(await screen.findByRole(mobile ? "button" : "menuitem", {name: "Cancel SDK activation"}));
    expect(selections).toEqual([]);
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
  });

  it("honors SDK-only submenu activation cancellation before mobile navigation", async () => {
    media.change(true);
    const user = userEvent.setup();
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub>
            <DropDrawerSubTrigger
              onClick={(event) => {
                event.preventBaseUIHandler();
              }}>
              Cancel SDK navigation
            </DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Child action</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );
    await user.click(await screen.findByRole("button", {name: "Cancel SDK navigation"}));
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it("allows the consumer to cancel mobile submenu navigation without dropping its handler", async () => {
    media.change(true);
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerSub>
            <DropDrawerSubTrigger
              onClick={(event) => {
                calls.push("click");
                event.preventDefault();
              }}>
              Stay here
            </DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Destination</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );
    await user.click(await screen.findByRole("button", {name: "Stay here"}));
    expect(calls).toEqual(["click"]);
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it.each([false, true])("disabled items suppress selection/click/key callbacks on mobile=%s", async (mobile) => {
    media.change(mobile);
    const calls: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            disabled
            onClick={() => calls.push("click")}
            onSelect={() => calls.push("select")}
            onKeyDown={() => calls.push("key")}>
            Disabled action
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    const control = await screen.findByRole(mobile ? "button" : "menuitem", {name: "Disabled action"});
    fireEvent.click(control);
    fireEvent.keyDown(control, {key: "Enter"});
    fireEvent.keyDown(control, {key: " "});
    expect(calls).toEqual([]);
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
  });

  it.each([false, true, "trap-focus"] as const)("honors actual drawer modal=%s rather than always adding a backdrop", async (modal) => {
    media.change(true);
    render(
      <Fixture
        defaultOpen
        modal={modal}
      />,
    );
    await screen.findByRole("dialog");
    expect(Boolean(document.querySelector('[data-slot="drawer-overlay"]'))).toBe(modal === true);
    expect(document.querySelector('[data-slot="drawer-viewport"]')).toHaveAttribute("data-modal", String(modal));
  });

  it("updates submenu disabled state before callbacks when its root props change", async () => {
    media.change(true);
    const clicks: string[] = [];
    function DisabledSub({disabled}: Readonly<{disabled: boolean}>): React.ReactElement {
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerSub disabled={disabled}>
              <DropDrawerSubTrigger onClick={() => clicks.push("clicked")}>Changing availability</DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem>Child action</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    const view = render(<DisabledSub disabled={false} />);
    const trigger = await screen.findByRole("button", {name: "Changing availability"});
    expect(trigger).not.toBeDisabled();
    view.rerender(<DisabledSub disabled />);
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(clicks).toEqual([]);
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it("honors controlled submenu requests and updated active content without caching children", async () => {
    media.change(true);
    const user = userEvent.setup();
    const requests: boolean[] = [];
    function ControlledSub(): React.ReactElement {
      const [open, setOpen] = React.useState(false);
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerSub
              open={open}
              onOpenChange={(nextOpen) => {
                requests.push(nextOpen);
                setOpen(nextOpen);
              }}>
              <DropDrawerSubTrigger>Controlled panel</DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem>Controlled child</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    render(<ControlledSub />);
    await user.click(await screen.findByRole("button", {name: "Controlled panel"}));
    expect(await screen.findByRole("button", {name: "Controlled child"})).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Go back"}));
    expect(requests).toEqual([true, false]);
    expect(screen.getByRole("button", {name: "Controlled panel"})).toHaveFocus();
  });

  it.each([false, true])("preserves custom native asChild trigger content, handlers, refs and form safety on mobile=%s", async (mobile) => {
    media.change(mobile);
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLButtonElement>();
    const rootRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    let submitted = 0;
    function NativeControl(props: Readonly<React.ComponentPropsWithRef<"button">>): React.ReactElement {
      return <button {...props} />;
    }
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted += 1;
        }}>
        <DropDrawer>
          <DropDrawerTrigger
            asChild
            ref={rootRef}
            onClick={() => calls.push("wrapper")}
            className={(state) => (state.open ? "open-trigger" : "closed-trigger")}>
            <NativeControl
              ref={childRef}
              onClick={() => calls.push("child")}>
              Custom actions
            </NativeControl>
          </DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Action</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>
      </form>,
    );
    const trigger = screen.getByRole("button", {name: "Custom actions"});
    expect(childRef.current).toBe(trigger);
    expect(rootRef.current).toBe(trigger);
    expect(trigger.querySelector("button")).toBeNull();
    expect(trigger).toHaveClass("closed-trigger");
    await user.click(trigger);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(submitted).toBe(0);
    expect(trigger).toHaveAttribute("type", "button");
    expect(trigger).toHaveClass("open-trigger");
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
  });

  it.each([false, true])("passes real primitive popup/item state to render and class callbacks on mobile=%s", async (mobile) => {
    media.change(mobile);
    const popupRef = React.createRef<HTMLElement>();
    const itemRef = React.createRef<HTMLElement>();
    const popupStates: object[] = [];
    const actionStates: object[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent
          ref={popupRef}
          className={(state) => (state.open ? "actual-popup-open" : "actual-popup-closed")}
          render={(props, state) => {
            popupStates.push(state);
            return <section {...props} />;
          }}>
          <DropDrawerItem
            ref={itemRef}
            closeOnClick={false}
            className={(state) => (state.disabled ? "action-disabled" : "action-enabled")}
            render={(props, state) => {
              actionStates.push(state);
              return mobile ? (
                <button
                  {...props}
                  type='button'
                />
              ) : (
                <div {...props} />
              );
            }}>
            Composed action
          </DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    const popup = await screen.findByRole(mobile ? "dialog" : "menu");
    const action = screen.getByRole(mobile ? "button" : "menuitem", {name: "Composed action"});
    expect(popupRef.current).toBe(popup);
    expect(itemRef.current).toBe(action);
    expect(popup.tagName).toBe("SECTION");
    expect(popup).toHaveClass("actual-popup-open");
    expect(action).toHaveClass("action-enabled");
    expect(popupStates).toContainEqual(
      expect.objectContaining(mobile ? {open: true, swiping: false, swipeDirection: "down"} : {open: true, side: "bottom"}),
    );
    expect(actionStates).toContainEqual(mobile ? {disabled: false} : {disabled: false, highlighted: false});
  });

  it("retains mobile-only SDK popup render/class callbacks on the real popup owner", async () => {
    media.change(true);
    const ref = React.createRef<HTMLElement>();
    const states: object[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent
          ref={ref}
          className='shared-popup-class'
          drawerProps={{
            className: (state) => (state.open ? "mobile-sdk-open" : "mobile-sdk-closed"),
            render: (props, state) => {
              states.push(state);
              return <section {...props} />;
            },
          }}>
          <DropDrawerItem>Native action</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    const popup = await screen.findByRole("dialog");
    expect(popup.tagName).toBe("SECTION");
    expect(ref.current).toBe(popup);
    expect(popup).toHaveClass("shared-popup-class", "mobile-sdk-open");
    expect(states).toContainEqual(expect.objectContaining({open: true, swipeDirection: "down", swiping: false}));
    expect(within(popup).getByRole("button", {name: "Native action"})).toBeVisible();
  });

  it("preserves element render action contents, cancellation and both actual DOM refs", async () => {
    media.change(true);
    const user = userEvent.setup();
    const childRef = React.createRef<HTMLButtonElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            ref={wrapperRef}
            onClick={() => calls.push("wrapper")}
            onSelect={() => calls.push("select")}
            render={
              <button
                ref={childRef}
                type='button'
                onClick={(event) => {
                  calls.push("child");
                  event.preventDefault();
                }}>
                Rendered contents
              </button>
            }
          />
        </DropDrawerContent>
      </DropDrawer>,
    );
    const action = await screen.findByRole("button", {name: "Rendered contents"});
    expect(childRef.current).toBe(action);
    expect(wrapperRef.current).toBe(action);
    await user.click(action);
    expect(calls).toEqual(["child", "wrapper"]);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("preserves mobile native keyboard activation and caller key cancellation without adding menu roles", async () => {
    media.change(true);
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            closeOnClick={false}
            onSelect={() => calls.push("action")}>
            Keyboard action
          </DropDrawerItem>
          <DropDrawerSub>
            <DropDrawerSubTrigger onKeyDown={(event) => event.preventDefault()}>Cancel keyboard navigation</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Child</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );
    const action = await screen.findByRole("button", {name: "Keyboard action"});
    act(() => action.focus());
    await user.keyboard("{Enter} ");
    expect(calls).toEqual(["action", "action"]);
    act(() => screen.getByRole("button", {name: "Cancel keyboard navigation"}).focus());
    await user.keyboard("{Enter} ");
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it("retains custom footer composition contents and an actual ref without leaking render props to DOM", async () => {
    media.change(true);
    const ref = React.createRef<HTMLElement>();
    const errors = vi.spyOn(console, "error");
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerFooter
            ref={ref}
            render={<aside aria-label='Footer actions'>Footer contents</aside>}
          />
        </DropDrawerContent>
      </DropDrawer>,
    );
    const footer = await screen.findByRole("complementary", {name: "Footer actions"});
    expect(ref.current).toBe(footer);
    expect(footer).toHaveTextContent("Footer contents");
    expect(footer).not.toHaveAttribute("render");
    expect(errors).not.toHaveBeenCalled();
  });
});

/** Deterministic layout, hit testing and pointer capture; no primitive or hook replacement. */
function installGesturePlatform(): {hit: (target: Element) => void; frame: () => void; restore: () => void} {
  let target: Element | null = null;
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const captures = new WeakMap<HTMLElement, Set<number>>();
  const descriptors = ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"].map(
    (name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const,
  );
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: {
      configurable: true,
      value(this: HTMLElement, id: number) {
        const ids = captures.get(this) ?? new Set<number>();
        ids.add(id);
        captures.set(this, ids);
      },
    },
    releasePointerCapture: {
      configurable: true,
      value(this: HTMLElement, id: number) {
        captures.get(this)?.delete(id);
      },
    },
    hasPointerCapture: {
      configurable: true,
      value(this: HTMLElement, id: number) {
        return captures.get(this)?.has(id) ?? false;
      },
    },
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("data-slot") === "drawer-viewport" ? 800 : 400;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, 0, 400, this.offsetHeight);
  });
  vi.spyOn(document, "elementFromPoint").mockImplementation(() => target);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  return {
    hit(element) {
      target = element;
    },
    frame() {
      act(() => {
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending) callback(16);
      });
    },
    restore() {
      frames.clear();
      for (const [name, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, name);
      }
      vi.restoreAllMocks();
    },
  };
}

function pointer(target: Element, type: string, y: number, timeStamp: number): void {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: 100,
    clientY: y,
  });
  Object.defineProperty(event, "timeStamp", {value: timeStamp});
  fireEvent(target, event);
}

describe("DropDrawer real Drawer gestures under restored platform boundaries", () => {
  it.each([false, true])("uses the actual swipe controller and honors cancellation=%s", async (cancelled) => {
    media.change(true);
    const platform = installGesturePlatform();
    const requests: {open: boolean; reason: string}[] = [];
    try {
      const user = userEvent.setup();
      render(
        <Fixture
          onOpenChange={(open, details) => {
            requests.push({open, reason: details.reason});
            if (cancelled && details.reason === "swipe") details.cancel();
          }}
        />,
      );
      const trigger = screen.getByRole("button", {name: "Open actions"});
      await user.click(trigger);
      platform.frame();
      const popup = await screen.findByRole("dialog");
      const handle = popup.querySelector('[data-slot="drawer-swipe-handle"]');
      if (!handle) throw new Error("DropDrawer must supply the real Drawer swipe surface.");
      platform.hit(handle);
      pointer(handle, "pointerdown", 30, 100);
      expect(popup).toHaveAttribute("data-swiping");
      pointer(handle, "pointermove", 40, 120);
      pointer(handle, "pointermove", 300, 820);
      expect(popup.style.getPropertyValue("--drawer-swipe-movement-y")).toBe("260px");
      pointer(handle, "pointerup", 300, 920);
      platform.frame();
      expect(requests).toContainEqual({open: false, reason: "swipe"});
      if (cancelled) expect(screen.getByRole("dialog")).toBeVisible();
      else {
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        platform.frame();
        await waitFor(() => expect(trigger).toHaveFocus());
      }
    } finally {
      cleanup();
      platform.restore();
    }
  });
});

describe("DropDrawer review fix round 1", () => {
  const itemCases = [false, true].flatMap((mobile) =>
    [false, true].flatMap((closeOnClick) =>
      (["render", "asChild", "function"] as const).map((composition) => ({mobile, closeOnClick, composition})),
    ),
  );

  it.each(itemCases)(
    "blocks disabled composed child and wrapper activation: mobile=$mobile, closeOnClick=$closeOnClick, composition=$composition",
    async ({mobile, closeOnClick, composition}) => {
      media.change(mobile);
      const user = userEvent.setup({pointerEventsCheck: 0});
      const calls: string[] = [];
      const childRef = React.createRef<HTMLAnchorElement>();
      const wrapperRef = React.createRef<HTMLElement>();
      const states: object[] = [];
      const childHandlers: React.DOMAttributes<HTMLAnchorElement> = {
        onClick: () => calls.push("child-click"),
        onClickCapture: () => calls.push("child-click-capture"),
        onKeyDown: () => calls.push("child-key-down"),
        onKeyDownCapture: () => calls.push("child-key-down-capture"),
        onKeyUp: () => calls.push("child-key-up"),
        onKeyUpCapture: () => calls.push("child-key-up-capture"),
      };
      const child = (
        <a
          {...childHandlers}
          ref={childRef}
          href='#disabled-target'>
          Disabled composed action
        </a>
      );

      const actionProps: React.ComponentProps<typeof DropDrawerItem> = {
        disabled: true,
        closeOnClick,
        nativeButton: false,
        ref: wrapperRef,
        onClick: () => calls.push("wrapper-click"),
        onClickCapture: () => calls.push("wrapper-click-capture"),
        onKeyDown: () => calls.push("wrapper-key-down"),
        onKeyDownCapture: () => calls.push("wrapper-key-down-capture"),
        onKeyUp: () => calls.push("wrapper-key-up"),
        onKeyUpCapture: () => calls.push("wrapper-key-up-capture"),
        onSelect: () => calls.push("selection"),
      };
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            {composition === "asChild" ? (
              <DropDrawerItem
                {...actionProps}
                asChild>
                {child}
              </DropDrawerItem>
            ) : (
              <DropDrawerItem
                {...actionProps}
                render={
                  composition === "render"
                    ? child
                    : (props, state) => {
                        states.push(state);
                        return (
                          <a
                            {...props}
                            href='#disabled-target'
                            onClick={(event) => {
                              childHandlers.onClick?.(event);
                              props.onClick?.(event);
                            }}
                            onClickCapture={(event) => {
                              childHandlers.onClickCapture?.(event);
                              props.onClickCapture?.(event);
                            }}
                            onKeyDown={(event) => {
                              childHandlers.onKeyDown?.(event);
                              props.onKeyDown?.(event);
                            }}
                            onKeyDownCapture={(event) => {
                              childHandlers.onKeyDownCapture?.(event);
                              props.onKeyDownCapture?.(event);
                            }}
                            onKeyUp={(event) => {
                              childHandlers.onKeyUp?.(event);
                              props.onKeyUp?.(event);
                            }}
                            onKeyUpCapture={(event) => {
                              childHandlers.onKeyUpCapture?.(event);
                              props.onKeyUpCapture?.(event);
                            }}>
                            Disabled composed action
                          </a>
                        );
                      }
                }
              />
            )}
          </DropDrawerContent>
        </DropDrawer>,
      );
      const control = await screen.findByRole(mobile ? "button" : "menuitem", {name: "Disabled composed action"});
      expect(control.tagName).toBe("A");
      expect(wrapperRef.current).toBe(control);
      if (composition === "function") expect(states).toContainEqual(expect.objectContaining({disabled: true}));
      else expect(childRef.current).toBe(control);
      expect(control).toHaveAttribute("aria-disabled", "true");
      const hash = window.location.hash;
      await user.click(control);
      for (const key of ["Enter", " "]) {
        fireEvent.keyDown(control, {key});
        fireEvent.keyUp(control, {key});
      }
      expect(calls).toEqual([]);
      expect(window.location.hash).toBe(hash);
      expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
    },
  );

  it.each([false, true].flatMap((mobile) => (["render", "function"] as const).map((composition) => ({mobile, composition}))))(
    "blocks disabled composed submenu child capture and bubble callbacks: mobile=$mobile, composition=$composition",
    async ({mobile, composition}) => {
      media.change(mobile);
      const user = userEvent.setup({pointerEventsCheck: 0});
      const calls: string[] = [];
      const ref = React.createRef<HTMLElement>();
      const childHandlers: React.DOMAttributes<HTMLAnchorElement> = {
        onClick: () => calls.push("child-click"),
        onClickCapture: () => calls.push("child-click-capture"),
        onKeyDown: () => calls.push("child-key-down"),
        onKeyDownCapture: () => calls.push("child-key-down-capture"),
        onKeyUp: () => calls.push("child-key-up"),
        onKeyUpCapture: () => calls.push("child-key-up-capture"),
      };
      render(
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerSub>
              <DropDrawerSubTrigger
                ref={ref}
                disabled
                nativeButton={false}
                onClick={() => calls.push("wrapper-click")}
                onClickCapture={() => calls.push("wrapper-click-capture")}
                onKeyDown={() => calls.push("wrapper-key-down")}
                onKeyDownCapture={() => calls.push("wrapper-key-down-capture")}
                onKeyUp={() => calls.push("wrapper-key-up")}
                onKeyUpCapture={() => calls.push("wrapper-key-up-capture")}
                render={
                  composition === "render" ? (
                    <a
                      {...childHandlers}
                      href='#disabled-submenu'>
                      Disabled composed submenu
                    </a>
                  ) : (
                    (props) => (
                      <a
                        {...props}
                        {...childHandlers}
                        href='#disabled-submenu'>
                        Disabled composed submenu
                      </a>
                    )
                  )
                }
              />
              <DropDrawerSubContent>
                <DropDrawerItem>Unreachable action</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>,
      );
      const control = await screen.findByRole(mobile ? "button" : "menuitem", {name: "Disabled composed submenu"});
      expect(ref.current).toBe(control);
      await user.click(control);
      for (const key of ["Enter", " "]) {
        fireEvent.keyDown(control, {key});
        fireEvent.keyUp(control, {key});
      }
      expect(calls).toEqual([]);
      expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
      expect(screen.queryByRole(mobile ? "button" : "menuitem", {name: "Unreachable action"})).not.toBeInTheDocument();
    },
  );

  it.each([false, true])(
    "preserves enabled child/wrapper capture order and refs through a disabled rerender on mobile=%s",
    async (mobile) => {
      media.change(mobile);
      const user = userEvent.setup({pointerEventsCheck: 0});
      const calls: string[] = [];
      const childRef = React.createRef<HTMLAnchorElement>();
      const wrapperRef = React.createRef<HTMLElement>();
      function ToggledAction({disabled}: Readonly<{disabled: boolean}>): React.ReactElement {
        return (
          <DropDrawer defaultOpen>
            <DropDrawerTrigger>Open</DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerItem
                ref={wrapperRef}
                disabled={disabled}
                nativeButton={false}
                closeOnClick={false}
                onClickCapture={() => calls.push("wrapper-capture")}
                onClick={() => calls.push("wrapper-bubble")}
                onSelect={() => calls.push("selection")}
                render={
                  <a
                    ref={childRef}
                    href='#enabled-target'
                    onClickCapture={() => calls.push("child-capture")}
                    onClick={(event) => {
                      calls.push("child-bubble");
                      event.preventDefault();
                    }}>
                    Toggled action
                  </a>
                }
              />
            </DropDrawerContent>
          </DropDrawer>
        );
      }
      const view = render(<ToggledAction disabled={false} />);
      const control = await screen.findByRole(mobile ? "button" : "menuitem", {name: "Toggled action"});
      await user.click(control);
      expect(calls).toEqual(["child-capture", "wrapper-capture", "child-bubble", "wrapper-bubble"]);
      expect(childRef.current).toBe(control);
      expect(wrapperRef.current).toBe(control);
      calls.length = 0;
      view.rerender(<ToggledAction disabled />);
      expect(wrapperRef.current).toBe(control);
      await user.click(control);
      expect(calls).toEqual([]);
      view.rerender(<ToggledAction disabled={false} />);
      await user.click(control);
      expect(calls).toEqual(["child-capture", "wrapper-capture", "child-bubble", "wrapper-bubble"]);
    },
  );

  it.each(["open", "defaultOpen"] as const)(
    "keeps main actions until the initially %s submenu has a live panel and recovers after removal",
    async (mode) => {
      media.change(true);
      const requests: boolean[] = [];
      function DeferredPanel({present}: Readonly<{present: boolean}>): React.ReactElement {
        return (
          <DropDrawer defaultOpen>
            <DropDrawerTrigger>Open</DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerItem closeOnClick={false}>Main deferred action</DropDrawerItem>
              <DropDrawerSub
                open={mode === "open" ? true : undefined}
                defaultOpen={mode === "defaultOpen"}
                onOpenChange={(open) => requests.push(open)}>
                <DropDrawerSubTrigger>Deferred submenu</DropDrawerSubTrigger>
                {present && (
                  <DropDrawerSubContent>
                    <DropDrawerItem closeOnClick={false}>Deferred action</DropDrawerItem>
                  </DropDrawerSubContent>
                )}
              </DropDrawerSub>
            </DropDrawerContent>
          </DropDrawer>
        );
      }
      const view = render(<DeferredPanel present={false} />);
      expect(await screen.findByRole("button", {name: "Main deferred action"})).toBeVisible();
      expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
      view.rerender(<DeferredPanel present />);
      const action = await screen.findByRole("button", {name: "Deferred action"});
      expect(action).toBeVisible();
      await waitFor(() => expect(action).toHaveFocus());
      expect(screen.queryByRole("button", {name: "Main deferred action"})).not.toBeInTheDocument();
      view.rerender(<DeferredPanel present={false} />);
      expect(screen.getByRole("button", {name: "Main deferred action"})).toBeVisible();
      expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
      view.rerender(<DeferredPanel present />);
      expect(await screen.findByRole("button", {name: "Deferred action"})).toBeVisible();
      expect(requests).toEqual([]);
    },
  );

  it("withdraws a controlled opening request while the panel is absent and preserves subsequent callback cancellation", async () => {
    media.change(true);
    const user = userEvent.setup();
    const requests: boolean[] = [];
    function DeferredControlled({open, present}: Readonly<{open: boolean; present: boolean}>): React.ReactElement {
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem closeOnClick={false}>Main controlled action</DropDrawerItem>
            <DropDrawerSub
              open={open}
              onOpenChange={(nextOpen, details) => {
                requests.push(nextOpen);
                details.cancel();
              }}>
              <DropDrawerSubTrigger>Controlled deferred submenu</DropDrawerSubTrigger>
              {present && (
                <DropDrawerSubContent>
                  <DropDrawerItem>Controlled deferred action</DropDrawerItem>
                </DropDrawerSubContent>
              )}
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    const view = render(
      <DeferredControlled
        open
        present={false}
      />,
    );
    expect(await screen.findByRole("button", {name: "Main controlled action"})).toBeVisible();
    view.rerender(
      <DeferredControlled
        open={false}
        present={false}
      />,
    );
    view.rerender(
      <DeferredControlled
        open={false}
        present
      />,
    );
    expect(screen.getByRole("button", {name: "Main controlled action"})).toBeVisible();
    await user.click(screen.getByRole("button", {name: "Controlled deferred submenu"}));
    expect(requests).toEqual([true]);
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Main controlled action"})).toBeVisible();
  });
});

describe("DropDrawer review fix round 1 native and ancestry invariants", () => {
  it.each([false, true])("blocks composed disabled root trigger callbacks without changing its actual ref on mobile=%s", async (mobile) => {
    media.change(mobile);
    const calls: string[] = [];
    const childRef = React.createRef<HTMLAnchorElement>();
    const wrapperRef = React.createRef<HTMLElement>();
    render(
      <DropDrawer>
        <DropDrawerTrigger
          asChild
          disabled
          nativeButton={false}
          ref={wrapperRef}
          onClick={() => calls.push("wrapper-click")}
          onClickCapture={() => calls.push("wrapper-capture")}>
          <a
            href='#disabled-root'
            ref={childRef}
            onClick={() => calls.push("child-click")}
            onClickCapture={() => calls.push("child-capture")}
            onKeyDown={() => calls.push("child-key")}>
            Disabled root trigger
          </a>
        </DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem>Root action</DropDrawerItem>
        </DropDrawerContent>
      </DropDrawer>,
    );
    const control = screen.getByRole("button", {name: "Disabled root trigger"});
    expect(childRef.current).toBe(control);
    expect(wrapperRef.current).toBe(control);
    await userEvent.setup({pointerEventsCheck: 0}).click(control);
    fireEvent.keyDown(control, {key: "Enter"});
    expect(calls).toEqual([]);
    expect(screen.queryByRole(mobile ? "dialog" : "menu")).not.toBeInTheDocument();
  });

  it.each([false, true])("honors explicit native disabled state on a composed button on mobile=%s", async (mobile) => {
    media.change(mobile);
    const calls: string[] = [];
    const ref = React.createRef<HTMLElement>();
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem
            ref={ref}
            closeOnClick={false}
            nativeButton
            onClickCapture={() => calls.push("wrapper-capture")}
            onKeyDownCapture={() => calls.push("wrapper-key-capture")}
            render={
              <button
                type='button'
                disabled
                onClick={() => calls.push("child-click")}
                onKeyDown={() => calls.push("child-key")}
                onKeyUp={() => calls.push("child-key-up")}>
                Native disabled composition
              </button>
            }
          />
        </DropDrawerContent>
      </DropDrawer>,
    );
    const control = await screen.findByRole(mobile ? "button" : "menuitem", {name: "Native disabled composition"});
    expect(control.tagName).toBe("BUTTON");
    expect(control).toBeDisabled();
    expect(ref.current).toBe(control);
    fireEvent.click(control);
    fireEvent.keyDown(control, {key: "Enter"});
    fireEvent.keyUp(control, {key: " "});
    expect(calls).toEqual([]);
    expect(screen.getByRole(mobile ? "dialog" : "menu")).toBeVisible();
  });

  it.each(["open", "defaultOpen"] as const)("waits for every live ancestor before applying a nested %s request", async (mode) => {
    media.change(true);
    function NestedDeferred({parentPresent}: Readonly<{parentPresent: boolean}>): React.ReactElement {
      return (
        <DropDrawer defaultOpen>
          <DropDrawerTrigger>Open</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem closeOnClick={false}>Main nested action</DropDrawerItem>
            <DropDrawerSub>
              <DropDrawerSubTrigger>Deferred parent</DropDrawerSubTrigger>
              <DropDrawerSub
                open={mode === "open" ? true : undefined}
                defaultOpen={mode === "defaultOpen"}>
                <DropDrawerSubTrigger>Nested requested panel</DropDrawerSubTrigger>
                <DropDrawerSubContent>
                  <DropDrawerItem closeOnClick={false}>Nested live action</DropDrawerItem>
                </DropDrawerSubContent>
              </DropDrawerSub>
              {parentPresent && (
                <DropDrawerSubContent>
                  <DropDrawerItem closeOnClick={false}>Parent live action</DropDrawerItem>
                </DropDrawerSubContent>
              )}
            </DropDrawerSub>
          </DropDrawerContent>
        </DropDrawer>
      );
    }
    const view = render(<NestedDeferred parentPresent={false} />);
    expect(await screen.findByRole("button", {name: "Main nested action"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
    view.rerender(<NestedDeferred parentPresent />);
    expect(await screen.findByRole("button", {name: "Nested live action"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Main nested action"})).not.toBeInTheDocument();
    view.rerender(<NestedDeferred parentPresent={false} />);
    expect(screen.getByRole("button", {name: "Main nested action"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
  });

  it("does not let a nested requested panel override an explicitly closed controlled ancestor", async () => {
    media.change(true);
    render(
      <DropDrawer defaultOpen>
        <DropDrawerTrigger>Open</DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerItem closeOnClick={false}>Main closed-parent action</DropDrawerItem>
          <DropDrawerSub open={false}>
            <DropDrawerSubTrigger>Closed parent</DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerSub open>
                <DropDrawerSubTrigger>Requested child</DropDrawerSubTrigger>
                <DropDrawerSubContent>
                  <DropDrawerItem>Nested blocked action</DropDrawerItem>
                </DropDrawerSubContent>
              </DropDrawerSub>
            </DropDrawerSubContent>
          </DropDrawerSub>
        </DropDrawerContent>
      </DropDrawer>,
    );
    expect(await screen.findByRole("button", {name: "Main closed-parent action"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Nested blocked action"})).not.toBeInTheDocument();
  });
});

describe("DropDrawer review fix round 2", () => {
  it("retains a flow-content boundary for an explicitly composed block trigger", () => {
    const errors = vi.spyOn(console, "error");
    const ref = React.createRef<HTMLElement>();
    render(
      <article>
        <DropDrawer>
          <DropDrawerTrigger
            ref={ref}
            nativeButton={false}
            render={<div />}>
            Block opener
          </DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Block action</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>
      </article>,
    );
    const trigger = screen.getByRole("button", {name: "Block opener"});
    expect(ref.current).toBe(trigger);
    expect(trigger.tagName).toBe("DIV");
    expect(trigger.parentElement?.tagName).toBe("DIV");
    expect(errors).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "accepted Back withdraws late descendant intent while cancelled Back retains it: cancelled=%s",
    async (cancelled) => {
      media.change(true);
      const user = userEvent.setup();
      const requests: [string, boolean][] = [];
      function LateChild({present}: Readonly<{present: boolean}>): React.ReactElement {
        return (
          <DropDrawer defaultOpen>
            <DropDrawerTrigger>Open</DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerItem closeOnClick={false}>Main after Back</DropDrawerItem>
              <DropDrawerSub
                onOpenChange={(open, details) => {
                  requests.push(["parent", open]);
                  if (cancelled && !open) details.cancel();
                }}>
                <DropDrawerSubTrigger>Parent submenu</DropDrawerSubTrigger>
                <DropDrawerSubContent>
                  <DropDrawerItem closeOnClick={false}>Parent action</DropDrawerItem>
                  <DropDrawerSub
                    defaultOpen
                    onOpenChange={(open) => requests.push(["child", open])}>
                    <DropDrawerSubTrigger>Late child submenu</DropDrawerSubTrigger>
                    {present && (
                      <DropDrawerSubContent>
                        <DropDrawerItem closeOnClick={false}>Late child action</DropDrawerItem>
                      </DropDrawerSubContent>
                    )}
                  </DropDrawerSub>
                </DropDrawerSubContent>
              </DropDrawerSub>
            </DropDrawerContent>
          </DropDrawer>
        );
      }
      const view = render(<LateChild present={false} />);
      const parent = await screen.findByRole("button", {name: "Parent submenu"});
      await user.click(parent);
      expect(await screen.findByRole("button", {name: "Parent action"})).toBeVisible();
      await user.click(screen.getByRole("button", {name: "Go back"}));
      if (!cancelled) {
        expect(screen.getByRole("button", {name: "Main after Back"})).toBeVisible();
        expect(parent).toHaveFocus();
      }
      view.rerender(<LateChild present />);
      if (cancelled) expect(await screen.findByRole("button", {name: "Late child action"})).toBeVisible();
      else {
        expect(screen.getByRole("button", {name: "Main after Back"})).toBeVisible();
        expect(screen.queryByRole("button", {name: "Go back"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Late child action"})).not.toBeInTheDocument();
        expect(parent).toHaveFocus();
        await user.click(parent);
        expect(await screen.findByRole("button", {name: "Parent action"})).toBeVisible();
        expect(screen.queryByRole("button", {name: "Late child action"})).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: "Late child submenu"}));
        expect(await screen.findByRole("button", {name: "Late child action"})).toBeVisible();
      }
      expect(requests.slice(0, 2)).toEqual([
        ["parent", true],
        ["parent", false],
      ]);
    },
  );

  it.each([false, true])("retains valid inline native trigger markup through SSR parsing and hydration on mobile=%s", async (mobile) => {
    media.change(mobile);
    const errors = vi.spyOn(console, "error");
    const recoverable: unknown[] = [];
    const ref = React.createRef<HTMLElement>();
    const markup = (
      <p data-testid='inline-parent'>
        Inline actions:
        <DropDrawer>
          <DropDrawerTrigger ref={ref}>Inline opener</DropDrawerTrigger>
          <DropDrawerContent>
            <DropDrawerItem>Inline action</DropDrawerItem>
          </DropDrawerContent>
        </DropDrawer>
      </p>
    );
    const html = renderToString(markup);
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const parsedParent = parsed.querySelector('[data-testid="inline-parent"]');
    expect(parsedParent?.querySelector("button")).not.toBeNull();
    expect(parsedParent?.querySelector("div")).toBeNull();
    expect(parsed.querySelectorAll("p")).toHaveLength(1);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, markup, {onRecoverableError: (error) => recoverable.push(error)});
      });
      const trigger = within(container).getByRole("button", {name: "Inline opener"});
      expect(ref.current).toBe(trigger);
      expect(trigger.tagName).toBe("BUTTON");
      expect(trigger.parentElement?.tagName).toBe("SPAN");
      expect(within(container).getByTestId("inline-parent")).toContainElement(trigger);
      expect(recoverable).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });

  it.each([false, true].flatMap((mobile) => [false, true].map((disabled) => ({mobile, disabled}))))(
    "preserves inline link refs, capture order and disabled activation: mobile=$mobile, disabled=$disabled",
    async ({mobile, disabled}) => {
      media.change(mobile);
      const errors = vi.spyOn(console, "error");
      const calls: string[] = [];
      const ref = React.createRef<HTMLElement>();
      const childRef = React.createRef<HTMLAnchorElement>();
      render(
        <p data-testid='inline-link-parent'>
          Links:
          <DropDrawer>
            <DropDrawerTrigger
              asChild
              disabled={disabled}
              nativeButton={false}
              ref={ref}
              onClickCapture={() => calls.push("wrapper-capture")}
              onClick={() => calls.push("wrapper-click")}>
              <a
                href='#inline-target'
                ref={childRef}
                onClickCapture={() => calls.push("child-capture")}
                onClick={(event) => {
                  calls.push("child-click");
                  event.preventDefault();
                }}>
                Inline link
              </a>
            </DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerItem>Link action</DropDrawerItem>
            </DropDrawerContent>
          </DropDrawer>
        </p>,
      );
      const control = screen.getByRole("button", {name: "Inline link"});
      expect(control.tagName).toBe("A");
      expect(control).toHaveAttribute("href", "#inline-target");
      expect(ref.current).toBe(control);
      expect(childRef.current).toBe(control);
      expect(control.parentElement?.tagName).toBe("SPAN");
      expect(screen.getByTestId("inline-link-parent")).toContainElement(control);
      await userEvent.setup({pointerEventsCheck: 0}).click(control);
      expect(calls).toEqual(disabled ? [] : ["child-capture", "wrapper-capture", "child-click", "wrapper-click"]);
      expect(errors).not.toHaveBeenCalled();
    },
  );
});
