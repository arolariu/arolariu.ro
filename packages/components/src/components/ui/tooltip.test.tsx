import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, root, Rule, type Node} from "postcss";
import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger} from "./tooltip";
import styles from "./tooltip.module.css";
import {Sidebar, SidebarMenuButton, SidebarProvider} from "./sidebar";
import * as stories from "./tooltip.stories";

const authoredStyles = parse(readFileSync(join(import.meta.dirname, "tooltip.module.css"), "utf8"));
const stylesheetFixtures: HTMLStyleElement[] = [];

function qualifiedSelector(rule: Rule): string {
  let selector = rule.selector;
  let ancestor: Node["parent"] = rule.parent;
  while (ancestor) {
    if (ancestor instanceof Rule) {
      const scope = `:is(${ancestor.selector})`;
      selector = selector.includes("&") ? selector.replaceAll("&", scope) : `${scope} ${selector}`;
    }
    ancestor = ancestor.parent;
  }
  return selector.replaceAll(/\.([a-zA-Z_][\w-]*)/gu, (match: string, name: string): string => (styles[name] ? `.${styles[name]}` : match));
}

function installAuthoredStyles(activeMediaQuery: string | null): void {
  // Happy DOM does not parse nested style rules. Resolve this sheet's nesting and
  // select an explicit media fixture; its actual DOM CSS cascade still owns declarations.
  const stylesheet = root();
  authoredStyles.walkRules((rule) => {
    let mediaQuery: string | null = null;
    let ancestor: Node["parent"] = rule.parent;
    while (ancestor) {
      if (ancestor instanceof AtRule && ancestor.name === "media") mediaQuery = ancestor.params;
      ancestor = ancestor.parent;
    }
    if (mediaQuery !== null && mediaQuery !== activeMediaQuery) return;
    const declarations = rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => {
        // Happy DOM has no native system palette; keep the authored tokens separately
        // asserted and supply a deterministic Canvas/CanvasText platform boundary.
        return node.clone({
          value: node.value.replaceAll(/\bCanvasText\b/gu, "rgb(0, 0, 0)").replaceAll(/\bCanvas\b/gu, "rgb(255, 255, 255)"),
        });
      });
    stylesheet.append(rule.clone({selector: qualifiedSelector(rule), nodes: declarations}));
  });
  const element = document.createElement("style");
  element.textContent = stylesheet.toString();
  document.head.append(element);
  stylesheetFixtures.push(element);
}

function renderTooltip({
  className,
  defaultOpen = false,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
}>) {
  return render(
    <Tooltip defaultOpen={defaultOpen}>
      <TooltipTrigger
        delay={0}
        render={triggerAsChild ? <button type='button'>Open tooltip</button> : undefined}>
        {triggerAsChild ? undefined : "Open tooltip"}
      </TooltipTrigger>
      <TooltipContent
        className={className}
        data-testid='tooltip-content'>
        Tooltip content
      </TooltipContent>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  it.each(
    (["static", "callback", "opaque"] as const).flatMap((mode) =>
      [
        {label: "absent", present: false, children: undefined, expected: "Fallback body"},
        {label: "undefined", present: true, children: undefined, expected: ""},
        {label: "null", present: true, children: null, expected: ""},
        {label: "false", present: true, children: false, expected: ""},
        {label: "zero", present: true, children: 0, expected: "0"},
        {label: "empty", present: true, children: "", expected: ""},
        {label: "element", present: true, children: <strong>Owned body</strong>, expected: "Owned body"},
      ].map((value) => ({mode, ...value})),
    ),
  )("preserves $mode render children presence for $label with the default arrow", async ({mode, present, children, expected}) => {
    const LazySurface = React.lazy(async () => ({
      default: (props: Readonly<React.ComponentPropsWithRef<"section">>): React.ReactElement => <section {...props} />,
    }));
    const childProps = present ? {children} : {};
    const element = mode === "opaque" ? <LazySurface {...childProps} /> : <section {...childProps} />;
    render(
      <React.Suspense fallback='Resolving tooltip surface'>
        <Tooltip defaultOpen>
          <TooltipTrigger>Presence trigger</TooltipTrigger>
          <TooltipContent
            render={
              mode === "callback"
                ? (props) => (
                    <section
                      {...props}
                      {...childProps}
                    />
                  )
                : element
            }>
            Fallback body
          </TooltipContent>
        </Tooltip>
      </React.Suspense>,
    );
    const popup = await screen.findByRole("tooltip");
    expect(popup.textContent).toBe(expected);
    expect(popup.querySelectorAll('[data-slot="tooltip-arrow"]')).toHaveLength(1);
  });

  it("refresh accessibility: wraps long supplemental copy within available width", () => {
    const css = readFileSync(join(import.meta.dirname, "tooltip.module.css"), "utf8");
    expect(css).toMatch(/\.popup\s*\{[^}]*max-width:\s*min\(var\(--available-width/u);
    expect(css).toMatch(/\.popup\s*\{[^}]*overflow-wrap:\s*anywhere/u);
  });

  it("keeps an emulated delayed hover crossing persistent and dismisses the tooltip on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider
        delay={0}
        closeDelay={0}>
        <Tooltip>
          <TooltipTrigger closeDelay={100}>Supplemental help</TooltipTrigger>
          <TooltipContent>Hoverable help</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const trigger = screen.getByRole("button", {name: "Supplemental help"});
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 120, 24));
    await user.pointer({target: trigger, coords: {x: 10, y: 10}});
    const popup = await screen.findByRole("tooltip");
    vi.spyOn(popup, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 28, 160, 48));
    await user.pointer({target: popup, coords: {x: 10, y: 35}});
    vi.useFakeTimers();
    try {
      await act(async () => vi.advanceTimersByTimeAsync(5000));
      expect(popup).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  afterEach(() => {
    cleanup();
    for (const stylesheet of stylesheetFixtures) stylesheet.remove();
    stylesheetFixtures.length = 0;
    vi.restoreAllMocks();
  });

  it("gives the real popup a tooltip role and describes its paired focused trigger", async () => {
    const user = userEvent.setup();
    renderTooltip({});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});
    expect(trigger).not.toHaveAttribute("aria-describedby");
    await user.tab();
    const popup = await screen.findByRole("tooltip");
    expect(popup.id).not.toBe("");
    expect(trigger).toHaveAttribute("aria-describedby", popup.id);
    expect(trigger).toHaveAccessibleDescription("Tooltip content");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).not.toHaveAttribute("aria-describedby"));
  });

  it("merges caller and render-element descriptions while respecting render IDs and caller naming", async () => {
    render(
      <>
        <span id='outer-description'>Outer description.</span>
        <span id='shared-description'>Shared description.</span>
        <span id='inner-description'>Inner description.</span>
        <Tooltip defaultOpen>
          <TooltipTrigger
            id='caller-trigger'
            aria-label='Caller name'
            aria-describedby='outer-description shared-description'
            render={
              <button
                id='render-trigger'
                aria-describedby='inner-description shared-description'
              />
            }
          />
          <TooltipContent
            id='caller-tooltip'
            render={<section id='render-tooltip' />}>
            Tooltip description.
          </TooltipContent>
        </Tooltip>
      </>,
    );
    const popup = await screen.findByRole("tooltip");
    const trigger = screen.getByRole("button", {name: "Caller name"});
    expect(trigger).toHaveAttribute("id", "render-trigger");
    expect(popup).toHaveAttribute("id", "render-tooltip");
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-describedby", "outer-description shared-description inner-description render-tooltip"),
    );
    expect(trigger).toHaveAccessibleDescription("Outer description. Shared description. Inner description. Tooltip description.");
  });

  it("updates committed popup IDs and removes only its own description on content unmount", async () => {
    const tree = (id: string, withContent: boolean): React.ReactElement => (
      <Tooltip open>
        <TooltipTrigger aria-describedby='existing-description'>Control</TooltipTrigger>
        {withContent ? <TooltipContent id={id}>Dynamic help</TooltipContent> : null}
      </Tooltip>
    );
    const {rerender} = render(tree("help-one", true));
    const trigger = screen.getByRole("button", {name: "Control"});
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "existing-description help-one"));
    rerender(tree("help-two", true));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "existing-description help-two"));
    expect(screen.getByRole("button", {name: "Control"})).toBe(trigger);
    rerender(tree("help-two", false));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "existing-description"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    rerender(tree("help-three", true));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "existing-description help-three"));
  });

  it("removes automatic descriptions while closed, retained, root-disabled or trigger-disabled", async () => {
    const tree = (open: boolean, disabled: boolean, triggerDisabled = false): React.ReactElement => (
      <Tooltip
        open={open}
        disabled={disabled}>
        <TooltipTrigger
          disabled={triggerDisabled}
          aria-describedby='caller-hint'>
          Control
        </TooltipTrigger>
        <TooltipContent
          keepMounted
          id='retained-help'>
          Retained help
        </TooltipContent>
      </Tooltip>
    );
    const {rerender} = render(tree(true, false));
    const trigger = screen.getByRole("button", {name: "Control"});
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "caller-hint retained-help"));
    rerender(tree(false, false));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "caller-hint"));
    expect(screen.getByText("Retained help")).toBeInTheDocument();
    rerender(tree(true, true));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "caller-hint"));
    rerender(tree(true, false, true));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "caller-hint"));
    rerender(tree(true, false));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "caller-hint retained-help"));
  });

  it("preserves callback-owned IDs, descriptions, refs and real primitive render state", async () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger
          ref={ref}
          aria-describedby='outer-hint'
          render={(props, state) => (
            <button
              {...props}
              aria-describedby='callback-hint'
              data-active={String(state.open)}>
              Control
            </button>
          )}
        />
        <TooltipContent
          render={(props, state) => (
            <section
              {...props}
              id={state.open ? "callback-open-help" : "callback-closed-help"}
            />
          )}>
          Callback help
        </TooltipContent>
      </Tooltip>,
    );
    const popup = await screen.findByRole("tooltip");
    const trigger = screen.getByRole("button", {name: "Control"});
    expect(popup.id).toBe("callback-open-help");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "outer-hint callback-hint callback-open-help"));
    expect(trigger).toHaveAttribute("data-active", "true");
    expect(ref.current).toBe(trigger);
  });

  it("does not replace a caller-owned role or describe cancelled opening requests", async () => {
    const user = userEvent.setup();
    const {rerender} = render(
      <Tooltip
        key='custom-role'
        defaultOpen>
        <TooltipTrigger>Control</TooltipTrigger>
        <TooltipContent
          role='status'
          id='status-help'>
          Status instead
        </TooltipContent>
      </Tooltip>,
    );
    expect(await screen.findByRole("status")).toHaveAttribute("id", "status-help");
    expect(screen.getByRole("button", {name: "Control"})).not.toHaveAttribute("aria-describedby");
    rerender(
      <Tooltip
        key='cancelled-root'
        onOpenChange={(_open, details) => details.cancel()}>
        <TooltipTrigger>Cancelled</TooltipTrigger>
        <TooltipContent>Cancelled help</TooltipContent>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Cancelled"})).not.toHaveAttribute("aria-describedby");
  });

  it("preserves explicit empty caller IDs and description attributes without generating a dangling reference", async () => {
    render(
      <Tooltip open>
        <TooltipTrigger aria-describedby=''>Control</TooltipTrigger>
        <TooltipContent id=''>Intentionally empty ID</TooltipContent>
      </Tooltip>,
    );
    expect(await screen.findByRole("tooltip")).toHaveAttribute("id", "");
    expect(screen.getByRole("button", {name: "Control"})).toHaveAttribute("aria-describedby", "");
  });

  it("describes only the SDK-active trigger when a root has multiple triggers", async () => {
    render(
      <Tooltip
        defaultOpen
        defaultTriggerId='second-trigger'>
        <TooltipTrigger id='first-trigger'>First</TooltipTrigger>
        <TooltipTrigger id='second-trigger'>Second</TooltipTrigger>
        <TooltipContent>Active help</TooltipContent>
      </Tooltip>,
    );
    const popup = await screen.findByRole("tooltip");
    expect(screen.getByRole("button", {name: "First"})).not.toHaveAttribute("aria-describedby");
    await waitFor(() => expect(screen.getByRole("button", {name: "Second"})).toHaveAttribute("aria-describedby", popup.id));
  });

  it("preserves real SDK handle payload ownership while adding the semantic pair", async () => {
    const user = userEvent.setup();
    const handle = BaseTooltip.createHandle<string>();
    render(
      <Tooltip<string> handle={handle}>
        {({payload}) => (
          <>
            <TooltipTrigger
              delay={0}
              handle={handle}
              payload='Payload help'>
              Payload trigger
            </TooltipTrigger>
            <TooltipContent>{payload ?? "No active payload"}</TooltipContent>
          </>
        )}
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Payload trigger"});
    await user.hover(trigger);
    const popup = await screen.findByRole("tooltip");
    expect(popup).toHaveTextContent("Payload help");
    expect(trigger).toHaveAccessibleDescription("Payload help");
  });

  it("leaves refused controlled opening requests closed rather than treating requests as primitive state", async () => {
    const user = userEvent.setup();
    const requests = vi.fn<NonNullable<Tooltip.Props["onOpenChange"]>>();
    render(
      <Tooltip
        open={false}
        onOpenChange={requests}>
        <TooltipTrigger delay={0}>Refused</TooltipTrigger>
        <TooltipContent
          keepMounted
          id='refused-help'>
          Retained but closed
        </TooltipContent>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Refused"});
    await user.hover(trigger);
    expect(requests).toHaveBeenCalledWith(true, expect.objectContaining({reason: "trigger-hover"}));
    expect(screen.getByText("Retained but closed")).toHaveAttribute("data-closed");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("respects render-owned roles and explicit hidden content without inventing an association", async () => {
    const {rerender} = render(
      <Tooltip open>
        <TooltipTrigger aria-describedby='caller-hint'>Control</TooltipTrigger>
        <TooltipContent
          render={
            <section
              role='status'
              id='render-status'
            />
          }>
          Status
        </TooltipContent>
      </Tooltip>,
    );
    expect(await screen.findByRole("status")).toHaveAttribute("id", "render-status");
    expect(screen.getByRole("button", {name: "Control"})).toHaveAttribute("aria-describedby", "caller-hint");
    rerender(
      <Tooltip open>
        <TooltipTrigger aria-describedby='caller-hint'>Control</TooltipTrigger>
        <TooltipContent
          aria-hidden='true'
          id='hidden-help'>
          Hidden help
        </TooltipContent>
      </Tooltip>,
    );
    await waitFor(() => expect(screen.getByRole("button", {name: "Control"})).toHaveAttribute("aria-describedby", "caller-hint"));
    expect(screen.getByText("Hidden help")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps callback-ref cleanup and the focused original trigger stable across description ID changes", async () => {
    const user = userEvent.setup();
    const cleanupRef = vi.fn();
    const ref = vi.fn<React.RefCallback<HTMLElement>>(() => cleanupRef);
    const tree = (id: string): React.ReactElement => (
      <Tooltip>
        <TooltipTrigger ref={ref}>Control</TooltipTrigger>
        <TooltipContent id={id}>Help</TooltipContent>
      </Tooltip>
    );
    const {rerender, unmount} = render(tree("first-help"));
    const trigger = screen.getByRole("button", {name: "Control"});
    await user.tab();
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "first-help"));
    rerender(tree("second-help"));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-describedby", "second-help"));
    expect(screen.getByRole("button", {name: "Control"})).toBe(trigger);
    expect(trigger).toHaveFocus();
    const cleanupsBeforeUnmount = cleanupRef.mock.calls.length;
    unmount();
    expect(cleanupRef).toHaveBeenCalledTimes(cleanupsBeforeUnmount + 1);
  });

  it("preserves detached typed handle triggers with caller-owned description wiring", async () => {
    const user = userEvent.setup();
    const handle = BaseTooltip.createHandle<{text: string}>();
    render(
      <>
        <TooltipTrigger<{text: string}>
          handle={handle}
          id='detached-trigger'
          payload={{text: "Detached payload"}}
          delay={0}
          aria-describedby='detached-help'>
          Detached
        </TooltipTrigger>
        <Tooltip<{text: string}> handle={handle}>
          {({payload}) => <TooltipContent id='detached-help'>{payload?.text ?? "No active payload"}</TooltipContent>}
        </Tooltip>
      </>,
    );
    const trigger = screen.getByRole("button", {name: "Detached"});
    await user.hover(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Detached payload");
    expect(trigger).toHaveAttribute("id", "detached-trigger");
    expect(trigger).toHaveAttribute("aria-describedby", "detached-help");
    expect(trigger).toHaveAccessibleDescription("Detached payload");
  });

  it("does not cross-wire generated tooltip IDs between independent roots", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger delay={0}>One</TooltipTrigger>
          <TooltipContent>One help</TooltipContent>
        </Tooltip>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger delay={0}>Two</TooltipTrigger>
          <TooltipContent>Two help</TooltipContent>
        </Tooltip>
      </>,
    );
    const firstTrigger = screen.getByRole("button", {name: "One"});
    const secondTrigger = screen.getByRole("button", {name: "Two"});
    await user.hover(firstTrigger);
    const firstPopup = await screen.findByRole("tooltip");
    await waitFor(() => expect(firstTrigger).toHaveAccessibleDescription("One help"));
    expect(secondTrigger).not.toHaveAttribute("aria-describedby");
    await user.unhover(firstTrigger);
    await waitFor(() => expect(firstTrigger).not.toHaveAttribute("aria-describedby"));
    await user.hover(secondTrigger);
    const secondPopup = await screen.findByText("Two help");
    expect(secondPopup).toHaveAttribute("role", "tooltip");
    await waitFor(() => expect(secondTrigger).toHaveAccessibleDescription("Two help"));
    expect(firstTrigger).not.toHaveAttribute("aria-describedby");
    expect(firstPopup.id).not.toBe(secondPopup.id);
  });

  it("describes the original composed Sidebar navigation link through the real Tooltip", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible='icon'>
          <SidebarMenuButton
            tooltip='Home details'
            render={<a href='#home'>Home</a>}
          />
        </Sidebar>
      </SidebarProvider>,
    );
    const link = screen.getByRole("link", {name: "Home"});
    await user.tab();
    const popup = await screen.findByRole("tooltip");
    expect(popup).toHaveTextContent("Home details");
    expect(link).toHaveAttribute("aria-describedby", popup.id);
    expect(link).toHaveAccessibleDescription("Home details");
    expect(screen.getAllByRole("link", {name: "Home"})).toEqual([link]);
    expect(link).toHaveFocus();
  });

  it("matches reduced-motion overrides to the actual portalled popup, not a nested popup", async () => {
    installAuthoredStyles("(prefers-reduced-motion: reduce)");
    renderTooltip({defaultOpen: true});

    const popup = await screen.findByTestId("tooltip-content");
    if (!styles.popup) throw new Error("Expected the authored popup CSS Module class");
    expect(popup).toHaveClass(styles.popup);
    expect(getComputedStyle(popup).transition).toBe("none");
  });

  it("applies forced-colors popup rules and preserves the Arrow background over the descendant reset", async () => {
    installAuthoredStyles("(forced-colors: active)");
    renderTooltip({defaultOpen: true});

    const popup = await screen.findByTestId("tooltip-content");
    const arrow = popup.querySelector('[data-slot="tooltip-arrow"]');
    expect(arrow).toBeInstanceOf(HTMLElement);
    if (!(arrow instanceof HTMLElement)) throw new Error("Expected the real Tooltip Arrow");
    const popupDeclarations = new Map<string, string>();
    authoredStyles.walkAtRules("media", (media) => {
      if (media.params !== "(forced-colors: active)") return;
      media.walkRules((rule) => {
        if (!popup.matches(qualifiedSelector(rule))) return;
        for (const declaration of rule.nodes) {
          if (declaration.type === "decl") popupDeclarations.set(declaration.prop, declaration.value);
        }
      });
    });
    expect(Object.fromEntries(popupDeclarations)).toMatchObject({
      border: "1px solid CanvasText",
      background: "Canvas",
      color: "CanvasText",
      "box-shadow": "none",
    });
    const popupStyle = getComputedStyle(popup);
    expect(popupStyle.borderTopColor).toBe("rgb(0, 0, 0)");
    expect(popupStyle.borderTopWidth).toBe("1px");
    expect(popupStyle.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(popupStyle.color).toBe("rgb(0, 0, 0)");
    expect(popupStyle.boxShadow).toBe("none");
    expect(getComputedStyle(arrow).backgroundColor).toBe("rgb(255, 255, 255)");
  });

  it("applies the adjacent-tooltip group layout outside both portalled popups", async () => {
    installAuthoredStyles(null);
    const {WithDelay} = composeStories(stories);
    const {container, unmount} = render(<WithDelay />);
    const group = screen.getByRole("button", {name: "First tooltip (1s)"}).parentElement;
    if (!group) throw new Error("Expected the authored story group");
    expect(group).toHaveClass("ac-story-tooltip-storyGroup");
    group.style.setProperty("--ac-space-3", "12px");
    expect(group.closest(`.${styles.popup}`)).toBeNull();
    expect(getComputedStyle(group).display).toBe("flex");
    expect(getComputedStyle(group).flexWrap).toBe("wrap");
    expect(getComputedStyle(group).gap).toBe("12px");
    expect(screen.getAllByRole("button")).toHaveLength(2);
    const sheet = container.querySelector("style");
    unmount();
    expect(sheet?.isConnected).toBe(false);
  });

  it("preserves live Trigger render callbacks, refs and merged classes", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    render(
      <Tooltip>
        <TooltipTrigger
          delay={0}
          ref={ref}
          className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
          render={(props, state) => <button {...props}>{state.open ? "Opened trigger" : "Closed trigger"}</button>}
        />
        <TooltipContent
          className={(state) => (state.open ? "popup-open" : "popup-closed")}
          render={(props, state) => (
            <section
              {...props}
              data-live-open={String(state.open)}>
              Callback body
            </section>
          )}
        />
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Closed trigger"});
    await user.hover(trigger);
    const popup = await screen.findByText("Callback body");
    expect(ref.current).toBe(screen.getByRole("button", {name: "Opened trigger"}));
    expect(ref.current).toHaveClass("trigger-open");
    expect(popup).toHaveClass("popup-open");
    expect(popup).toHaveAttribute("data-live-open", "true");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("preserves slot child refs and focus-handler cancellation", async () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const childFocus = vi.fn();
    render(
      <Tooltip>
        <TooltipTrigger
          ref={ref}
          className='outer-trigger'
          onFocus={(event) => event.preventBaseUIHandler()}
          render={
            <button
              ref={childRef}
              className='child-trigger'
              onFocus={childFocus}>
              Cancelled focus
            </button>
          }
        />
        <TooltipContent>Must remain closed</TooltipContent>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Cancelled focus"});
    fireEvent.focus(trigger);
    expect(ref.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("outer-trigger", "child-trigger");
    expect(childFocus).toHaveBeenCalledOnce();
    expect(screen.queryByText("Must remain closed")).not.toBeInTheDocument();
  });

  it("composes exactly one custom arrow with a real primitive state and ref", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          showArrow={false}
          side='bottom'
          collisionAvoidance={{side: "none", align: "none"}}>
          Custom help
          <TooltipArrow
            ref={ref}
            className={(state) => (state.open ? "arrow-open" : "arrow-closed")}
            render={(props, state) => (
              <div
                {...props}
                data-arrow-side={state.side}
              />
            )}
          />
        </TooltipContent>
      </Tooltip>,
    );
    const popup = await screen.findByText("Custom help");
    expect(popup.querySelectorAll('[data-slot="tooltip-arrow"]')).toHaveLength(1);
    expect(ref.current).toHaveClass("arrow-open");
    expect(ref.current).toHaveAttribute("data-arrow-side", "bottom");
    expect(ref.current).toHaveAttribute("aria-hidden", "true");
  });

  it("supports lazy component render boundaries without losing element content or refs", async () => {
    const LazySurface = React.lazy(async () => ({
      default: ({ref, ...props}: Readonly<React.ComponentPropsWithRef<"div">>): React.ReactElement => (
        <div
          {...props}
          ref={ref}
        />
      ),
    }));
    const popupRef = React.createRef<HTMLDivElement>();
    const childRef = React.createRef<HTMLDivElement>();
    render(
      <React.Suspense fallback='Loading surface'>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent
            ref={popupRef}
            render={<LazySurface ref={childRef}>Lazy body</LazySurface>}
          />
        </Tooltip>
      </React.Suspense>,
    );
    const popup = await screen.findByText("Lazy body");
    expect(popupRef.current).toBe(popup);
    expect(childRef.current).toBe(popup);
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("retains every child of an invalid multi-child legacy slot rather than silently selecting the first", () => {
    render(
      <Tooltip>
        <TooltipTrigger>
          <span>First</span>
          <span>Second</span>
        </TooltipTrigger>
      </Tooltip>,
    );
    expect(screen.getByRole("button", {name: "First Second"})).toBeInTheDocument();
  });

  it("renders a primitive arrow and routes measured alignment options to the Positioner", async () => {
    expect(TooltipArrow).toBeDefined();
    const ref = React.createRef<HTMLDivElement>();
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    const sideOffset = vi.fn<Exclude<TooltipContent.Props["sideOffset"], number | undefined>>(() => 12);
    const alignOffset = vi.fn<Exclude<TooltipContent.Props["alignOffset"], number | undefined>>(() => 6);
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          ref={ref}
          aria-label='Help'
          anchor={anchor}
          side='bottom'
          align='start'
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionAvoidance={{side: "none", align: "none"}}>
          Aligned help
        </TooltipContent>
      </Tooltip>,
    );

    const popup = await screen.findByText("Aligned help");
    await waitFor(() => expect(sideOffset).toHaveBeenCalledWith(expect.objectContaining({anchor: {width: 80, height: 20}})));
    expect(alignOffset).toHaveBeenCalledWith(expect.objectContaining({side: "bottom", align: "start"}));
    expect(ref.current).toBe(popup);
    expect(popup).toHaveAttribute("aria-label", "Help");
    expect(popup).toHaveAttribute("data-align", "start");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
    expectTypeOf<TooltipContent.State>().toEqualTypeOf<import("@base-ui/react/tooltip").Tooltip.Popup.State>();
    vi.restoreAllMocks();
  });

  it("preserves a composed render element's children while adding the arrow", async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent render={<section>Composed body</section>} />
      </Tooltip>,
    );

    const popup = await screen.findByText("Composed body");
    expect(popup.tagName).toBe("SECTION");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("keeps closed popup content mounted on the Portal", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Tooltip>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          keepMounted
          ref={ref}>
          Persistent help
        </TooltipContent>
      </Tooltip>,
    );
    await waitFor(() => expect(ref.current).toBeInTheDocument());
    expect(ref.current).toHaveAttribute("data-closed");
    expect(ref.current).not.toHaveAttribute("keepMounted");
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderTooltip({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {name: "Open tooltip"})).toBeInTheDocument();
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  describe("Tooltip timing", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      cleanup();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("uses the provider's 1000ms opening delay instead of the primitive default", async () => {
      render(
        <TooltipProvider delay={1000}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Delayed content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.queryByText("Delayed content")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Delayed content")).toBeInTheDocument();
    });

    it("uses the native trigger's zero-delay timing contract", async () => {
      render(
        <Tooltip disableHoverablePopup>
          <TooltipTrigger delay={0}>Hover</TooltipTrigger>
          <TooltipContent>Immediate content</TooltipContent>
        </Tooltip>,
      );

      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Immediate content")).toBeInTheDocument();
    });

    it("uses native Provider delay=0", async () => {
      render(
        <TooltipProvider delay={0}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Canonical delay</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Canonical delay")).toBeInTheDocument();
    });

    it("uses explicit Trigger delays over Provider zero", async () => {
      render(
        <TooltipProvider delay={0}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger delay={1000}>Slow root</TooltipTrigger>
            <TooltipContent>Root-delayed help</TooltipContent>
          </Tooltip>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger delay={0}>Fast trigger</TooltipTrigger>
            <TooltipContent>Trigger-immediate help</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const slowTrigger = screen.getByRole("button", {name: "Slow root"});
      fireEvent.pointerEnter(slowTrigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(slowTrigger);
      fireEvent.mouseMove(slowTrigger);
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.queryByText("Root-delayed help")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Root-delayed help")).toBeInTheDocument();
      fireEvent.mouseLeave(slowTrigger, {relatedTarget: document.body});
      await act(async () => vi.advanceTimersByTimeAsync(500));
      const fastTrigger = screen.getByRole("button", {name: "Fast trigger"});
      fireEvent.pointerEnter(fastTrigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(fastTrigger);
      fireEvent.mouseMove(fastTrigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Trigger-immediate help")).toBeInTheDocument();
    });

    it("honors Provider closeDelay and opens an adjacent tooltip instantly during the shared window", async () => {
      render(
        <TooltipProvider
          delay={1000}
          closeDelay={200}
          timeout={400}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>First</TooltipTrigger>
            <TooltipContent>First help</TooltipContent>
          </Tooltip>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Second</TooltipTrigger>
            <TooltipContent>Second help</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const first = screen.getByRole("button", {name: "First"});
      fireEvent.pointerEnter(first, {pointerType: "mouse"});
      fireEvent.mouseEnter(first);
      fireEvent.mouseMove(first);
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      expect(screen.getByText("First help")).toBeInTheDocument();
      fireEvent.mouseLeave(first, {relatedTarget: document.body});
      await act(async () => vi.advanceTimersByTimeAsync(199));
      expect(screen.getByText("First help")).toHaveAttribute("data-open");
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("First help")).toHaveAttribute("data-closed");
      const second = screen.getByRole("button", {name: "Second"});
      fireEvent.pointerEnter(second, {pointerType: "mouse"});
      fireEvent.mouseEnter(second);
      fireEvent.mouseMove(second);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Second help")).toBeInTheDocument();
    });
  });

  it("opens on hover and focus", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});

    // Act
    await user.hover(trigger);

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();

    // Act
    await user.unhover(trigger);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
    });

    // Act
    await user.tab();

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  it("closes when hover leaves the trigger", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});
    await user.hover(trigger);
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();

    // Act
    await user.unhover(trigger);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderTooltip({className: "custom-tooltip-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toHaveClass("custom-tooltip-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({triggerAsChild: true});

    // Act
    await user.hover(screen.getByRole("button", {name: "Open tooltip"}));

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  it("dismisses keyboard-opened tooltip on Escape and closes on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip>
          <TooltipTrigger>Focus tooltip</TooltipTrigger>
          <TooltipContent>Keyboard help</TooltipContent>
        </Tooltip>
        <button>Next target</button>
      </>,
    );
    await user.tab();
    expect(await screen.findByText("Keyboard help")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Keyboard help")).not.toBeInTheDocument());
    await user.tab();
    await user.tab({shift: true});
    expect(await screen.findByText("Keyboard help")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next target"})).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Keyboard help")).not.toBeInTheDocument());
  });

  it("exposes tooltip accessibility semantics", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});

    // Act
    await user.hover(trigger);

    // Assert
    const tooltip = await screen.findByTestId("tooltip-content");

    expect(tooltip).toHaveTextContent("Tooltip content");
    expect(tooltip).toHaveAttribute("tabindex", "-1");
    expect(tooltip).toHaveAttribute("data-side", "top");
  });
});

describe("Tooltip final review L25: documented offset", () => {
  it("places content 4px above its anchor by default", async () => {
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent
          anchor={anchor}
          align='start'
          collisionAvoidance={{side: "none", align: "none"}}>
          Save changes
        </TooltipContent>
      </Tooltip>,
    );
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveAttribute("data-side", "top");
    await waitFor(() => expect(tooltip.parentElement).toHaveStyle({transform: "translate(200px, 96px)"}));
  });
});
