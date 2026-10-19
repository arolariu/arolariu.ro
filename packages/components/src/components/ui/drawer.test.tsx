import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type AnyNode} from "postcss";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import styles from "./drawer.module.css";
import * as stories from "./drawer.stories";

const {SnapPoints: SnapPointsStory} = composeStories(stories);

const originalBodyStyles = document.body.style.cssText;
const originalHtmlStyles = document.documentElement.style.cssText;

afterEach(async () => {
  cleanup();
  // Base UI releases its shared scroll locker on a zero-delay timeout, not synchronously.
  await waitFor(() => {
    expect(document.body.style.cssText).toBe(originalBodyStyles);
    expect(document.documentElement.style.cssText).toBe(originalHtmlStyles);
  });
});

function drawerClass(name: string): string {
  const value = styles[name];
  if (value === undefined) throw new Error(`Missing drawer CSS Module class: ${name}`);
  return value;
}

/** Resolve authored class/attribute rules only; this is not a layout or paint engine. */
function authoredStyles(element: HTMLElement, reducedMotion = false, forcedColors = false, desktop = false): Map<string, string> {
  const values = new Map<string, {value: string; priority: number}>();
  const stylesheet = parse(readFileSync(join(import.meta.dirname, "drawer.module.css"), "utf8"));
  stylesheet.walkRules((rule) => {
    for (let parent: AnyNode["parent"] = rule.parent; parent; parent = parent.parent) {
      if (!(parent instanceof AtRule)) continue;
      if (parent.name === "supports") return;
      if (parent.name === "media") {
        if (parent.params.includes("prefers-reduced-motion") && !reducedMotion) return;
        if (parent.params.includes("forced-colors") && !forcedColors) return;
        if (parent.params.includes("min-width") && !desktop) return;
      }
    }
    const matching = rule.selectors.filter((selector) => !selector.includes("::") && element.matches(selector));
    if (!matching.length) return;
    const specificity = Math.max(...matching.map((selector) => selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/gu)?.length ?? 0));
    rule.walkDecls((declaration) => {
      for (let parent: AnyNode["parent"] = declaration.parent; parent && parent !== rule; parent = parent.parent) {
        if (parent instanceof AtRule) return;
      }
      const priority = specificity + (declaration.important ? 1000 : 0);
      if (priority >= (values.get(declaration.prop)?.priority ?? -1)) {
        values.set(declaration.prop, {value: declaration.value, priority});
      }
    });
  });
  return new Map([...values].map(([key, {value}]) => [key, value]));
}

describe("Drawer authored gesture presentation (no layout/paint assertion)", () => {
  it("refresh accessibility: keeps tall drawer content scrollable within its bounded popup", () => {
    const content = document.createElement("div");
    content.className = "content";
    expect(authoredStyles(content).get("overflow-y")).toBe("auto");
  });

  it("does not apply declarations nested inside unsupported conditional at-rules", () => {
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    expect(authoredStyles(backdrop).get("position")).toBe("fixed");
  });

  it.each([
    {direction: "down", axis: "y", edge: "bottom", closed: "100%"},
    {direction: "up", axis: "y", edge: "top", closed: "-100%"},
    {direction: "left", axis: "x", edge: "left", closed: "-100%"},
    {direction: "right", axis: "x", edge: "right", closed: "100%"},
  ] as const)("anchors and translates the $direction popup using the primitive movement variable", ({direction, axis, edge, closed}) => {
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.dataset["swipeDirection"] = direction;
    popup.dataset["swipeAxis"] = axis;
    const rules = authoredStyles(popup);
    expect(rules.get(edge)).toBe("0");
    expect(rules.get(axis === "x" ? "--translate-x" : "--translate-y")).toContain(`--drawer-swipe-movement-${axis}`);
    expect(rules.get("--closed-transform")).toContain(closed);
    expect(rules.get("transform")).toContain("var(--stack-scale)");
    if (axis === "x") {
      expect(rules.get("flex-direction")).toBe("row");
      expect(rules.get("bottom")).toBeUndefined();
      expect(authoredStyles(popup, false, false, true).get("--drawer-content-width")).toBe("24rem");
    }
  });

  it("derives backdrop progress and uses snap-point opacity without fighting transition endpoints", () => {
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.setAttribute("data-snap-points", "");
    expect(authoredStyles(backdrop).get("--drawer-overlay-min-opacity")).toBe("0.5");
    expect(authoredStyles(backdrop).get("opacity")).toContain("--drawer-swipe-progress");
    backdrop.setAttribute("data-swiping", "");
    expect(authoredStyles(backdrop).get("transition-duration")).toBe("0ms");
    backdrop.setAttribute("data-ending-style", "");
    expect(authoredStyles(backdrop).get("opacity")).toBe("0");
    expect(authoredStyles(backdrop).get("transition-duration")).toContain("--drawer-swipe-strength");
  });

  it("keeps nonmodal viewport hit testing transparent while the popup stays interactive", () => {
    const viewport = document.createElement("div");
    viewport.className = "viewport";
    viewport.setAttribute("data-modal", "false");
    expect(authoredStyles(viewport).get("pointer-events")).toBe("none");
    viewport.setAttribute("data-modal", "trap-focus");
    expect(authoredStyles(viewport).get("pointer-events")).toBe("none");
    viewport.setAttribute("data-modal", "true");
    expect(authoredStyles(viewport).get("pointer-events")).toBe("auto");
    const popup = document.createElement("div");
    popup.className = "popup";
    expect(authoredStyles(popup).get("pointer-events")).toBe("auto");
  });

  it("uses stack variables and hides the rear content/handle until the child is swiped", () => {
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.setAttribute("data-swipe-axis", "y");
    popup.setAttribute("data-nested-drawer-open", "");
    const content = document.createElement("div");
    content.className = "content";
    const handle = document.createElement("div");
    handle.className = "handle";
    popup.append(content, handle);
    const rules = authoredStyles(popup);
    expect(rules.get("height")).toBe("var(--stack-height)");
    expect(rules.get("--stack-scale-base")).toContain("--nested-drawers");
    expect(rules.get("--stack-height")).toContain("--drawer-frontmost-height");
    expect(authoredStyles(content).get("opacity")).toBe("0");
    expect(authoredStyles(handle).get("opacity")).toBe("0");
    popup.setAttribute("data-nested-drawer-swiping", "");
    expect(authoredStyles(popup).get("transition-duration")).toBe("0ms");
    expect(authoredStyles(content).get("opacity")).toBe("1");
    expect(authoredStyles(handle).get("opacity")).toBe("1");
  });

  it("honors reduced motion even for combined swipe/ending state selectors and preserves forced-colors boundaries", () => {
    const popup = document.createElement("div");
    popup.className = "popup";
    for (const attribute of ["data-swiping", "data-ending-style", "data-nested-drawer-swiping"]) popup.setAttribute(attribute, "");
    expect(authoredStyles(popup, true).get("transition-duration")).toBe("0ms");
    expect(authoredStyles(popup, false, true).get("border-color")).toBe("CanvasText");
    expect(authoredStyles(popup, false, true).get("filter")).toBe("none");
    const handle = document.createElement("div");
    handle.className = "handle";
    expect(authoredStyles(handle, true).get("transition-duration")).toBe("0ms");
  });
});

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
  it.each(["ordinary", "opaque"] as const)(
    "retains the content gesture boundary and handle for %s element-owned children",
    async (kind) => {
      const element = (
        <section>
          <DrawerTitle>Composed drawer</DrawerTitle>
          <DrawerClose>Dismiss composed drawer</DrawerClose>
        </section>
      );
      // Synthetic opaque-slot characterization; genuine Flight decoding is an integration obligation.
      const slot =
        kind === "ordinary" ? element : {...element, $$typeof: Symbol.for("react.lazy"), _payload: element, _init: () => element};
      render(
        <Drawer
          defaultOpen
          showSwipeHandle>
          <DrawerContent render={slot} />
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Composed drawer"});
      const content = popup.querySelector('[data-slot="drawer-content"]');
      expect(content).toContainElement(screen.getByRole("button", {name: "Dismiss composed drawer"}));
      expect(popup.querySelectorAll('[data-slot="drawer-content"]')).toHaveLength(1);
      expect(popup.querySelectorAll('[data-slot="drawer-swipe-handle"]')).toHaveLength(1);
      expect(popup.querySelector('[data-slot="drawer-swipe-handle"]')).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("leaves an unopened pending popup slot unresolved", () => {
    const normalize = vi.fn(() => {
      throw new Promise<void>(() => undefined);
    });
    const pending: React.ReactElement & Readonly<{$$typeof: symbol; _payload: null; _init: () => never}> = {
      ...(<section />),
      $$typeof: Symbol.for("react.lazy"),
      _payload: null,
      _init: normalize,
    };
    render(
      <React.Suspense fallback={<p>Suspended drawer</p>}>
        <Drawer>
          <DrawerTrigger>Open pending drawer</DrawerTrigger>
          <DrawerContent render={pending} />
        </Drawer>
      </React.Suspense>,
    );
    expect(screen.getByRole("button", {name: "Open pending drawer"})).toBeVisible();
    expect(screen.queryByText("Suspended drawer")).not.toBeInTheDocument();
    expect(normalize).not.toHaveBeenCalled();
  });

  it("keeps the full primitive Root and render contracts while accurately typing composed refs", () => {
    expectTypeOf<Exclude<keyof BaseDrawer.Root.Props, keyof Drawer.Props>>().toEqualTypeOf<never>();
    expectTypeOf<Drawer.Props<{title: string}>["children"]>().toEqualTypeOf<BaseDrawer.Root.Props<{title: string}>["children"]>();
    expectTypeOf<DrawerTrigger.Props["render"]>().toEqualTypeOf<BaseDrawer.Trigger.Props["render"]>();
    expectTypeOf<DrawerContent.Props["render"]>().toEqualTypeOf<BaseDrawer.Popup.Props["render"]>();
    expectTypeOf<DrawerOverlay.Props["render"]>().toEqualTypeOf<BaseDrawer.Backdrop.Props["render"]>();
    expectTypeOf<DrawerTitle.Props["render"]>().toEqualTypeOf<BaseDrawer.Title.Props["render"]>();
    expectTypeOf<DrawerDescription.Props["render"]>().toEqualTypeOf<BaseDrawer.Description.Props["render"]>();
    expectTypeOf<DrawerContent.State>().toEqualTypeOf<Readonly<BaseDrawer.Popup.State>>();
    expectTypeOf<DrawerTrigger.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
    expectTypeOf<DrawerContent.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
    expectTypeOf<DrawerOverlay.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
    expectTypeOf<DrawerTitle.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
    expectTypeOf<DrawerDescription.Props["ref"]>().toEqualTypeOf<React.Ref<HTMLElement> | undefined>();
  });

  it("places the popup inside the real gesture viewport", async () => {
    renderDrawer({defaultOpen: true});

    const popup = await screen.findByRole("dialog", {name: "Drawer title"});
    expect(popup.parentElement).toHaveAttribute("data-slot", "drawer-viewport");
    expect(popup.parentElement).toHaveAttribute("data-open");
  });

  it("does not impose a decorative handle by default", async () => {
    renderDrawer({defaultOpen: true});
    const popup = await screen.findByRole("dialog", {name: "Drawer title"});
    expect(popup.querySelector("[data-drawer-content]")?.previousElementSibling).toBeNull();
  });

  it("adds a separate hidden-from-accessibility swipe handle only when requested", async () => {
    render(
      <Drawer
        defaultOpen
        showSwipeHandle>
        <DrawerContent>
          <DrawerTitle>Handle drawer</DrawerTitle>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Handle drawer"});
    const handle = popup.querySelector('[data-slot="drawer-swipe-handle"]');
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle?.nextElementSibling).toHaveAttribute("data-drawer-content");
  });

  it.each([
    {direction: "down", axis: "y"},
    {direction: "up", axis: "y"},
    {direction: "left", axis: "x"},
    {direction: "right", axis: "x"},
  ] as const)("exposes the $direction axis without changing primitive direction state", async ({direction, axis}) => {
    render(
      <Drawer
        defaultOpen
        swipeDirection={direction}>
        <DrawerContent>
          <DrawerTitle>Direction drawer</DrawerTitle>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Direction drawer"});
    expect(popup).toHaveAttribute("data-swipe-direction", direction);
    expect(popup).toHaveAttribute("data-swipe-axis", axis);
  });

  it.each([false, "trap-focus"] as const)("omits the blocking backdrop for modal=%s", async (modal) => {
    render(
      <Drawer
        defaultOpen
        modal={modal}>
        <DrawerContent>
          <DrawerTitle>Nonblocking drawer</DrawerTitle>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Nonblocking drawer"});
    expect(popup.parentElement).toHaveAttribute("data-modal", String(modal));
    expect(document.querySelector(`.${styles.backdrop}`)).not.toBeInTheDocument();
    expect(document.body.style.overflowY).not.toBe("hidden");
  });

  it("passes primitive popup state to render and class callbacks and forwards a composed ref", async () => {
    const popupRef = React.createRef<HTMLElement>();
    const states: DrawerContent.State[] = [];
    render(
      <Drawer
        defaultOpen
        swipeDirection='left'>
        <DrawerContent
          ref={popupRef}
          className={(state) => (state.open ? "open-drawer" : "closed-drawer")}
          render={(props, state) => {
            states.push(state);
            return <section {...props} />;
          }}>
          <DrawerTitle>Composed drawer</DrawerTitle>
          <DrawerDescription>Composed description</DrawerDescription>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Composed drawer"});
    expect(states).toContainEqual(expect.objectContaining({open: true, swipeDirection: "left", nested: false, swiping: false}));
    expect(popup).toHaveClass(drawerClass("popup"), "open-drawer");
    expect(popup.tagName).toBe("SECTION");
    expect(popupRef.current).toBe(popup);
    expect(popup).toHaveAccessibleDescription("Composed description");
  });

  it("wraps render-element children in the gesture-aware Content without discarding them", async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent
          render={
            <section className='consumer-popup'>
              <DrawerTitle>Render-owned title</DrawerTitle>
              <DrawerDescription>Render-owned description</DrawerDescription>
              <DrawerClose>Close</DrawerClose>
            </section>
          }
        />
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Render-owned title"});
    expect(popup).toHaveClass(drawerClass("popup"), "consumer-popup");
    expect(popup.querySelector("[data-drawer-content]")).toContainElement(screen.getByText("Render-owned title"));
    expect(popup).toHaveAccessibleDescription("Render-owned description");
  });

  it("passes the actual disabled and open trigger state to its render callback", async () => {
    const states: DrawerTrigger.State[] = [];
    render(
      <Drawer>
        <DrawerTrigger
          disabled
          render={(props, state) => {
            states.push(state);
            return <button {...props} />;
          }}>
          Disabled drawer
        </DrawerTrigger>
      </Drawer>,
    );
    expect(screen.getByRole("button", {name: "Disabled drawer"})).toBeDisabled();
    expect(states).toContainEqual({disabled: true, open: false});
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderDrawer({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open drawer"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog", {name: "Drawer title"})).toBeVisible();
  });

  /** Only layout/hit testing, pointer capture and the animation clock are platform doubles. */
  function installGesturePlatform() {
    let hitTarget: Element | null = null;
    let nextFrame = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const captures = new WeakMap<HTMLElement, Set<number>>();
    const originalCapture = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "setPointerCapture");
    const originalRelease = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "releasePointerCapture");
    const originalHasCapture = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hasPointerCapture");

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
    vi.spyOn(document, "elementFromPoint").mockImplementation(() => hitTarget);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });

    return {
      hit(target: Element): void {
        hitTarget = target;
      },
      frame(): void {
        act(() => {
          const pending = [...frames.values()];
          frames.clear();
          for (const callback of pending) callback(16);
        });
      },
      restore(): void {
        frames.clear();
        for (const [name, descriptor] of [
          ["setPointerCapture", originalCapture],
          ["releasePointerCapture", originalRelease],
          ["hasPointerCapture", originalHasCapture],
        ] as const) {
          if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
          else Reflect.deleteProperty(HTMLElement.prototype, name);
        }
        vi.restoreAllMocks();
      },
    };
  }

  function dispatchPointer(target: Element, type: string, x: number, y: number, timeStamp: number): void {
    const event = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, "timeStamp", {value: timeStamp});
    fireEvent(target, event);
  }

  describe("Drawer gesture controller under deterministic DOM boundaries", () => {
    let platform: ReturnType<typeof installGesturePlatform> | undefined;

    afterEach(() => {
      cleanup();
      platform?.restore();
      platform = undefined;
    });

    it("requests swipe dismissal and returns focus after a real pointer sequence", async () => {
      platform = installGesturePlatform();
      const requests: {open: boolean; reason: string}[] = [];
      const user = userEvent.setup();
      render(
        <Drawer onOpenChange={(open, details) => requests.push({open, reason: details.reason})}>
          <DrawerTrigger>Open gesture drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Gesture drawer</DrawerTitle>
            <DrawerDescription>Controller fixture, not a physical touch test.</DrawerDescription>
            <DrawerClose>Close gesture drawer</DrawerClose>
          </DrawerContent>
        </Drawer>,
      );
      const trigger = screen.getByRole("button", {name: "Open gesture drawer"});
      await user.click(trigger);
      platform.frame();
      const popup = await screen.findByRole("dialog", {name: "Gesture drawer"});
      await waitFor(() => expect(popup).toHaveFocus());
      platform.hit(popup);

      dispatchPointer(popup, "pointerdown", 100, 30, 100);
      expect(popup).toHaveAttribute("data-swiping");
      dispatchPointer(popup, "pointermove", 100, 40, 120);
      dispatchPointer(popup, "pointermove", 100, 300, 820);
      expect(popup.style.getPropertyValue("--drawer-swipe-movement-y")).toBe("260px");
      dispatchPointer(popup, "pointerup", 100, 300, 920);
      platform.frame();

      expect(requests).toContainEqual({open: false, reason: "swipe"});
      await waitFor(() => expect(screen.queryByRole("dialog", {name: "Gesture drawer"})).not.toBeInTheDocument());
      platform.frame();
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it.each([
      {direction: "down", from: [100, 50], to: [100, 310], movement: "--drawer-swipe-movement-y", expected: "260px"},
      {direction: "up", from: [100, 310], to: [100, 50], movement: "--drawer-swipe-movement-y", expected: "-260px"},
      {direction: "left", from: [310, 100], to: [50, 100], movement: "--drawer-swipe-movement-x", expected: "-260px"},
      {direction: "right", from: [50, 100], to: [310, 100], movement: "--drawer-swipe-movement-x", expected: "260px"},
    ] as const)(
      "delegates $direction dragging on the optional handle to the viewport",
      async ({direction, from, to, movement, expected}) => {
        platform = installGesturePlatform();
        const requests: string[] = [];
        render(
          <Drawer
            defaultOpen
            showSwipeHandle
            swipeDirection={direction}
            onOpenChange={(_, details) => requests.push(details.reason)}>
            <DrawerContent>
              <DrawerTitle>Directional gesture</DrawerTitle>
            </DrawerContent>
          </Drawer>,
        );
        const popup = await screen.findByRole("dialog", {name: "Directional gesture"});
        const handle = popup.querySelector('[data-slot="drawer-swipe-handle"]');
        if (!handle) throw new Error("Missing swipe handle");
        platform.hit(handle);
        dispatchPointer(handle, "pointerdown", from[0], from[1], 100);
        dispatchPointer(handle, "pointermove", from[0], from[1], 120);
        dispatchPointer(handle, "pointermove", to[0], to[1], 820);
        expect(popup).toHaveAttribute("data-swiping");
        expect(popup.style.getPropertyValue(movement)).toBe(expected);
        expect(document.querySelector('[data-slot="drawer-overlay"]')?.getAttribute("data-swiping")).toBe("");
        expect(document.querySelector<HTMLElement>('[data-slot="drawer-overlay"]')?.style.getPropertyValue("--drawer-swipe-progress")).toBe(
          "0.65",
        );
        dispatchPointer(handle, "pointerup", to[0], to[1], 920);
        platform.frame();
        expect(requests).toContain("swipe");
        await waitFor(() => expect(popup).not.toBeInTheDocument());
      },
    );

    it("ignores pointer drags beginning in Content so ordinary controls remain usable", async () => {
      platform = installGesturePlatform();
      const user = userEvent.setup();
      const requests: string[] = [];
      render(
        <Drawer
          defaultOpen
          onOpenChange={(_, details) => requests.push(details.reason)}>
          <DrawerContent>
            <DrawerTitle>Control drawer</DrawerTitle>
            <label>
              Drawer input
              <input name='drawer-input' />
            </label>
            <DrawerClose>Close control drawer</DrawerClose>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Control drawer"});
      const input = screen.getByRole("textbox", {name: "Drawer input"});
      platform.hit(input);
      dispatchPointer(input, "pointerdown", 100, 50, 100);
      dispatchPointer(input, "pointermove", 100, 50, 120);
      dispatchPointer(input, "pointermove", 100, 310, 820);
      dispatchPointer(input, "pointerup", 100, 310, 920);
      expect(popup).not.toHaveAttribute("data-swiping");
      expect(requests).toEqual([]);
      await user.type(input, "content remains editable");
      expect(input).toHaveValue("content remains editable");
      await user.click(screen.getByRole("button", {name: "Close control drawer"}));
      expect(requests).toContain("close-press");
    });

    it("honors cancellation of a swipe close request", async () => {
      platform = installGesturePlatform();
      render(
        <Drawer
          defaultOpen
          onOpenChange={(open, details) => {
            if (!open && details.reason === "swipe") details.cancel();
          }}>
          <DrawerContent>
            <DrawerTitle>Persistent drawer</DrawerTitle>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Persistent drawer"});
      platform.hit(popup);
      dispatchPointer(popup, "pointerdown", 100, 50, 100);
      dispatchPointer(popup, "pointermove", 100, 50, 120);
      dispatchPointer(popup, "pointermove", 100, 310, 820);
      dispatchPointer(popup, "pointerup", 100, 310, 920);
      platform.frame();
      expect(popup).toHaveAttribute("data-open");
      expect(popup).not.toHaveAttribute("data-ending-style");
      expect(popup).not.toHaveAttribute("data-swipe-dismiss");
    });

    it.each([
      {direction: "down", start: 350, end: 60, before: "200px"},
      {direction: "up", start: 60, end: 350, before: "-200px"},
    ] as const)("preserves $direction default snaps and delegates snap requests", async ({direction, start, end, before}) => {
      platform = installGesturePlatform();
      const snaps: {value: Drawer.Props["snapPoint"]; reason: string}[] = [];
      const opens: string[] = [];
      render(
        <Drawer
          defaultOpen
          swipeDirection={direction}
          snapPoints={[200, 400]}
          snapToSequentialPoints
          onSnapPointChange={(value, details) => snaps.push({value, reason: details.reason})}
          onOpenChange={(_, details) => opens.push(details.reason)}>
          <DrawerContent>
            <DrawerTitle>Snap drawer</DrawerTitle>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Snap drawer"});
      await waitFor(() => expect(popup.style.getPropertyValue("--drawer-snap-point-offset")).toBe(before));
      expect(popup).toHaveAttribute("data-snap-points");
      expect(document.querySelector('[data-slot="drawer-overlay"]')).toHaveAttribute("data-snap-points");
      platform.hit(popup);
      dispatchPointer(popup, "pointerdown", 100, start, 100);
      dispatchPointer(popup, "pointermove", 100, start, 120);
      dispatchPointer(popup, "pointermove", 100, end, 820);
      dispatchPointer(popup, "pointerup", 100, end, 920);
      platform.frame();
      expect(snaps).toContainEqual({value: 400, reason: "swipe"});
      expect(popup.style.getPropertyValue("--drawer-snap-point-offset")).toBe("0px");
      expect(opens).toEqual([]);
    });

    it("keeps a controlled snap in place when its change request is canceled", async () => {
      platform = installGesturePlatform();
      const values: Drawer.Props["snapPoint"][] = [];
      render(
        <Drawer
          defaultOpen
          snapPoints={[200, 400]}
          snapPoint={400}
          onSnapPointChange={(value, details) => {
            values.push(value);
            details.cancel();
          }}>
          <DrawerContent>
            <DrawerTitle>Canceled snap drawer</DrawerTitle>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Canceled snap drawer"});
      platform.hit(popup);
      dispatchPointer(popup, "pointerdown", 100, 50, 100);
      dispatchPointer(popup, "pointermove", 100, 50, 120);
      dispatchPointer(popup, "pointermove", 100, 250, 820);
      dispatchPointer(popup, "pointerup", 100, 250, 920);
      platform.frame();
      expect(values).toEqual([200]);
      expect(popup.style.getPropertyValue("--drawer-snap-point-offset")).toBe("0px");
      expect(popup).toHaveAttribute("data-open");
    });

    it("suspends the parent gesture controller while a nested drawer is open", async () => {
      platform = installGesturePlatform();
      const parentRequests: string[] = [];
      const childRequests: string[] = [];
      render(
        <Drawer
          defaultOpen
          showSwipeHandle
          onOpenChange={(_, details) => parentRequests.push(details.reason)}>
          <DrawerContent>
            <DrawerTitle>Parent drawer</DrawerTitle>
            <Drawer
              defaultOpen
              swipeDirection='right'
              showSwipeHandle
              onOpenChange={(_, details) => childRequests.push(details.reason)}>
              <DrawerContent>
                <DrawerTitle>Nested drawer</DrawerTitle>
                <DrawerClose>Close nested drawer</DrawerClose>
              </DrawerContent>
            </Drawer>
          </DrawerContent>
        </Drawer>,
      );
      const parent = await screen.findByRole("dialog", {name: "Parent drawer", hidden: true});
      const child = await screen.findByRole("dialog", {name: "Nested drawer"});
      await waitFor(() => expect(parent).toHaveAttribute("data-nested-drawer-open"));
      expect(document.querySelectorAll('[data-slot="drawer-overlay"]')).toHaveLength(1);
      platform.hit(parent);
      dispatchPointer(parent, "pointerdown", 100, 50, 100);
      dispatchPointer(parent, "pointermove", 100, 50, 120);
      dispatchPointer(parent, "pointermove", 100, 310, 820);
      dispatchPointer(parent, "pointerup", 100, 310, 920);
      expect(parentRequests).toEqual([]);
      expect(parent).not.toHaveAttribute("data-swiping");

      platform.hit(child);
      dispatchPointer(child, "pointerdown", 50, 100, 1100);
      dispatchPointer(child, "pointermove", 50, 100, 1120);
      dispatchPointer(child, "pointermove", 310, 100, 1820);
      expect(parent).toHaveAttribute("data-nested-drawer-swiping");
      expect(parent.style.getPropertyValue("--drawer-swipe-progress")).not.toBe("0");
      dispatchPointer(child, "pointerup", 310, 100, 1920);
      platform.frame();
      expect(childRequests).toContain("swipe");
      expect(parentRequests).toEqual([]);
      await waitFor(() => expect(child).not.toBeInTheDocument());
      expect(parent).toHaveAttribute("data-open");
      expect(parent).not.toHaveAttribute("data-nested-drawer-open");
      expect(parent).not.toHaveAttribute("data-nested-drawer-swiping");
    });
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

  it("closes the drawer when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDrawer({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open drawer"}));
    expect(await screen.findByRole("dialog", {name: "Drawer title"})).toBeVisible();

    // Act — Base UI Drawer supports Escape to dismiss, same as the Dialog primitive
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Drawer title"})).not.toBeInTheDocument();
    });
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

  it("renders DrawerHeader with children", async () => {
    // Arrange
    const {DrawerHeader} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader data-testid='drawer-header'>
            <DrawerTitle>Header Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );

    // Assert
    const header = await screen.findByTestId("drawer-header");
    expect(header).toBeInTheDocument();
    expect(screen.getByText("Header Title")).toBeInTheDocument();
  });

  it("renders DrawerFooter with children", async () => {
    // Arrange
    const {DrawerFooter} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
          <DrawerFooter data-testid='drawer-footer'>
            <button type='button'>Action</button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );

    // Assert
    const footer = await screen.findByTestId("drawer-footer");
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Action"})).toBeInTheDocument();
  });

  it("renders DrawerHeader with a composed element", async () => {
    // Arrange
    const {DrawerHeader} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader
            data-testid='drawer-header'
            render={<header>Custom Header</header>}
          />
        </DrawerContent>
      </Drawer>,
    );

    // Assert
    const header = await screen.findByTestId("drawer-header");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("HEADER");
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("renders DrawerFooter with a composed element", async () => {
    // Arrange
    const {DrawerFooter} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
          <DrawerFooter
            data-testid='drawer-footer'
            render={<footer>Custom Footer</footer>}
          />
        </DrawerContent>
      </Drawer>,
    );

    // Assert
    const footer = await screen.findByTestId("drawer-footer");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("FOOTER");
    expect(screen.getByText("Custom Footer")).toBeInTheDocument();
  });

  it("requests modal scroll lock and restores the document after closing", async () => {
    const user = userEvent.setup();
    const originalOverflow = document.body.style.overflowY;
    renderDrawer({defaultOpen: true});
    const dialog = await screen.findByRole("dialog", {name: "Drawer title"});
    expect(dialog.parentElement).toHaveAttribute("data-modal", "true");
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toHaveAttribute("data-open");
    await user.click(screen.getByRole("button", {name: "Close drawer"}));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(document.body.style.overflowY).toBe(originalOverflow);
  });

  it("passes actual backdrop state, class callbacks and both composed refs directly to Base UI", async () => {
    const wrapperRef = React.createRef<HTMLElement>();
    const elementRef = React.createRef<HTMLElement>();
    const states: DrawerOverlay.State[] = [];
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerOverlay
            ref={wrapperRef}
            className={(state) => (state.open ? "open-backdrop" : "closed-backdrop")}
            render={(props, state) => {
              states.push(state);
              return (
                <aside
                  {...props}
                  ref={(element) => {
                    elementRef.current = element;
                    if (typeof props.ref === "function") return props.ref(element);
                  }}
                />
              );
            }}
          />
          <BaseDrawer.Viewport>
            <BaseDrawer.Popup>
              <DrawerTitle>Manual primitive composition</DrawerTitle>
              <DrawerClose>Close</DrawerClose>
            </BaseDrawer.Popup>
          </BaseDrawer.Viewport>
        </DrawerPortal>
      </Drawer>,
    );
    await screen.findByRole("dialog", {name: "Manual primitive composition"});
    const backdrop = document.querySelector('[data-slot="drawer-overlay"]');
    expect(states).toContainEqual(expect.objectContaining({open: true}));
    expect(backdrop).toHaveClass(drawerClass("backdrop"), "open-backdrop");
    expect(backdrop?.tagName).toBe("ASIDE");
    expect(wrapperRef.current).toBe(backdrop);
    expect(elementRef.current).toBe(backdrop);
  });

  it("preserves title/description children, composed refs, ids and primitive class callbacks", async () => {
    const titleRef = React.createRef<HTMLElement>();
    const descriptionRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLHeadingElement>();
    const titleClassStates: DrawerTitle.State[] = [];
    const descriptionClassStates: DrawerDescription.State[] = [];
    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle
            ref={titleRef}
            className={(state) => {
              titleClassStates.push(state);
              return "title-class";
            }}
            render={
              <h3
                ref={childRef}
                className='child-title-class'>
                Element-owned title
              </h3>
            }
          />
          <DrawerDescription
            ref={descriptionRef}
            className={(state) => {
              descriptionClassStates.push(state);
              return "description-class";
            }}
            render={(props) => <div {...props} />}>
            Actual accessible description
          </DrawerDescription>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Element-owned title"});
    expect(popup).toHaveAccessibleDescription("Actual accessible description");
    expect(titleRef.current).toBe(childRef.current);
    expect(titleRef.current?.tagName).toBe("H3");
    expect(titleRef.current).toHaveClass(drawerClass("title"), "title-class", "child-title-class");
    expect(descriptionRef.current).toHaveClass(drawerClass("description"), "description-class");
    expect(descriptionRef.current?.tagName).toBe("DIV");
    expect(titleClassStates).toContainEqual({});
    expect(descriptionClassStates).toContainEqual({});
  });

  it("preserves merged popup element refs and callbacks without evaluating render outside Base UI", async () => {
    const wrapperRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLElement>();
    const calls: string[] = [];
    const user = userEvent.setup();
    const view = render(
      <Drawer defaultOpen>
        <DrawerContent
          ref={wrapperRef}
          onClick={() => calls.push("wrapper")}
          render={
            <section
              ref={childRef}
              onClick={() => calls.push("element")}
            />
          }>
          <DrawerTitle>Merged popup</DrawerTitle>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Merged popup"});
    expect(wrapperRef.current).toBe(popup);
    expect(childRef.current).toBe(popup);
    await user.click(popup);
    expect(calls).toEqual(["element", "wrapper"]);
    view.unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("retains callback-ref cleanup through title and description composition", async () => {
    const cleaned: string[] = [];
    const view = render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle
            ref={() => () => {
              cleaned.push("title");
            }}>
            Cleanup drawer
          </DrawerTitle>
          <DrawerDescription
            ref={() => () => {
              cleaned.push("description");
            }}>
            Cleanup description
          </DrawerDescription>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    await screen.findByRole("dialog", {name: "Cleanup drawer"});
    view.unmount();
    expect(cleaned).toEqual(["title", "description"]);
  });

  it("preserves explicit layout children and polymorphic refs with canonical function render", () => {
    const headerRef = React.createRef<HTMLElement>();
    const footerRef = React.createRef<HTMLElement>();
    render(
      <>
        <DrawerHeader
          ref={headerRef}
          render={(props) => <header {...props} />}>
          Header children
        </DrawerHeader>
        <DrawerFooter
          ref={footerRef}
          render={<footer className='consumer-footer' />}>
          Footer children
        </DrawerFooter>
      </>,
    );
    expect(headerRef.current?.tagName).toBe("HEADER");
    expect(headerRef.current).toHaveTextContent("Header children");
    expect(footerRef.current?.tagName).toBe("FOOTER");
    expect(footerRef.current).toHaveTextContent("Footer children");
    expect(footerRef.current).toHaveClass(drawerClass("footer"), "consumer-footer");
  });

  it("preserves native disabled triggers and caller cancellation for composed triggers", async () => {
    const requests: boolean[] = [];
    const ref = React.createRef<HTMLAnchorElement>();
    const user = userEvent.setup();
    render(
      <Drawer onOpenChange={(open) => requests.push(open)}>
        <DrawerTrigger disabled>Native disabled</DrawerTrigger>
        <DrawerTrigger
          nativeButton={false}
          disabled
          render={<a href='#disabled' />}>
          Link disabled
        </DrawerTrigger>
        <DrawerTrigger
          ref={ref}
          nativeButton={false}
          onClick={(event) => event.preventBaseUIHandler()}
          render={
            <a
              href='#drawer'
              onClick={(event) => event.preventDefault()}
            />
          }>
          Canceled link
        </DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>No opening</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await user.click(screen.getByRole("button", {name: "Native disabled"}));
    const disabledLink = screen.getByRole("button", {name: "Link disabled"});
    expect(disabledLink).toHaveAttribute("aria-disabled", "true");
    await user.click(disabledLink);
    const link = screen.getByRole("button", {name: "Canceled link"});
    expect(ref.current).toBe(link);
    await user.click(link);
    expect(requests).toEqual([]);
    expect(screen.queryByRole("dialog", {name: "No opening"})).not.toBeInTheDocument();
  });

  it("passes Root payload children and imperative action contracts without storing drawer state", async () => {
    const handle = BaseDrawer.createHandle<{title: string}>();
    const actions = React.createRef<BaseDrawer.Root.Actions>();
    const user = userEvent.setup();
    render(
      <>
        <BaseDrawer.Trigger
          handle={handle}
          payload={{title: "Payload title"}}>
          Detached trigger
        </BaseDrawer.Trigger>
        <Drawer
          handle={handle}
          actionsRef={actions}>
          {({payload}) => (
            <DrawerContent>
              <DrawerTitle>{payload?.title}</DrawerTitle>
              <DrawerDescription>Typed primitive payload</DrawerDescription>
            </DrawerContent>
          )}
        </Drawer>
      </>,
    );
    const trigger = screen.getByRole("button", {name: "Detached trigger"});
    await user.click(trigger);
    expect(await screen.findByRole("dialog", {name: "Payload title"})).toHaveAccessibleDescription("Typed primitive payload");
    act(() => actions.current?.close());
    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Payload title"})).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("leaves controlled open state with the caller while forwarding trigger/close requests", async () => {
    const requests: boolean[] = [];
    const user = userEvent.setup();
    function fixture(open: boolean): React.ReactElement {
      return (
        <Drawer
          open={open}
          onOpenChange={(value) => requests.push(value)}>
          <DrawerTrigger>Controlled trigger</DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Controlled drawer</DrawerTitle>
            <DrawerClose>Controlled close</DrawerClose>
          </DrawerContent>
        </Drawer>
      );
    }
    const view = render(fixture(false));
    await user.click(screen.getByRole("button", {name: "Controlled trigger"}));
    expect(requests).toEqual([true]);
    expect(screen.queryByRole("dialog", {name: "Controlled drawer"})).not.toBeInTheDocument();
    view.rerender(fixture(true));
    const popup = await screen.findByRole("dialog", {name: "Controlled drawer"});
    await user.click(screen.getByRole("button", {name: "Controlled close"}));
    expect(requests).toEqual([true, false]);
    expect(popup).toHaveAttribute("data-open");
    view.rerender(fixture(false));
    await waitFor(() => expect(popup).not.toBeInTheDocument());
  });

  it("preserves explicit initial/final focus with focus trapping but no blocking backdrop or scroll lock", async () => {
    const initial = React.createRef<HTMLInputElement>();
    const final = React.createRef<HTMLButtonElement>();
    const user = userEvent.setup();
    render(
      <>
        <button
          type='button'
          ref={final}>
          Final focus target
        </button>
        <Drawer modal='trap-focus'>
          <DrawerTrigger>Open focus drawer</DrawerTrigger>
          <DrawerContent
            initialFocus={initial}
            finalFocus={final}>
            <DrawerTitle>Focus drawer</DrawerTitle>
            <input
              ref={initial}
              aria-label='Initial focus target'
            />
            <DrawerClose>Close focus drawer</DrawerClose>
          </DrawerContent>
        </Drawer>
      </>,
    );
    await user.click(screen.getByRole("button", {name: "Open focus drawer"}));
    await screen.findByRole("dialog", {name: "Focus drawer"});
    await waitFor(() => expect(initial.current).toHaveFocus());
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeInTheDocument();
    expect(document.body.style.overflowY).not.toBe("hidden");
    await user.tab();
    expect(screen.getByRole("button", {name: "Close focus drawer"})).toHaveFocus();
    await user.tab();
    expect(initial.current).toHaveFocus();
    await user.click(screen.getByRole("button", {name: "Close focus drawer"}));
    await waitFor(() => expect(final.current).toHaveFocus());
  });

  it("exposes a separately composed handle without giving it an interactive role", () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <DrawerSwipeHandle
        ref={ref}
        render={<span className='custom-handle' />}
        data-testid='standalone-handle'>
        Decorative content
      </DrawerSwipeHandle>,
    );
    const handle = screen.getByTestId("standalone-handle");
    expect(ref.current).toBe(handle);
    expect(handle.tagName).toBe("SPAN");
    expect(handle).toHaveClass(drawerClass("handle"), "custom-handle");
    expect(handle).toHaveTextContent("Decorative content");
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle).not.toHaveAttribute("tabindex");
    expect(handle).not.toHaveAttribute("role");
  });

  it("keeps the styled drawer and its form state mounted through portalProps.keepMounted", async () => {
    const user = userEvent.setup();
    render(
      <Drawer defaultOpen>
        <DrawerTrigger>Reopen kept drawer</DrawerTrigger>
        <DrawerContent portalProps={{keepMounted: true}}>
          <DrawerTitle>Kept drawer</DrawerTitle>
          <input aria-label='Drawer draft' />
          <DrawerClose>Close kept drawer</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Kept drawer"});
    await user.type(screen.getByRole("textbox", {name: "Drawer draft"}), "kept");
    await user.click(screen.getByRole("button", {name: "Close kept drawer"}));
    await waitFor(() => expect(popup).toHaveAttribute("hidden"));
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveClass(drawerClass("popup"));
    await user.click(screen.getByRole("button", {name: "Reopen kept drawer"}));
    expect(await screen.findByRole("dialog", {name: "Kept drawer"})).toBe(popup);
    expect(screen.getByRole("textbox", {name: "Drawer draft"})).toHaveValue("kept");
  });

  it("portals the styled drawer, viewport and backdrop into portalProps.container with the remaining Portal props", async () => {
    const host = document.createElement("section");
    document.body.append(host);
    const view = render(
      <Drawer defaultOpen>
        <DrawerContent portalProps={{container: host, className: "caller-portal"}}>
          <DrawerTitle>Contained drawer</DrawerTitle>
          <DrawerClose>Close</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = await screen.findByRole("dialog", {name: "Contained drawer"});
    expect(host).toContainElement(popup);
    expect(host).toContainElement(document.querySelector<HTMLElement>('[data-slot="drawer-overlay"]'));
    expect(popup.closest(".caller-portal")?.parentElement).toBe(host);
    view.unmount();
    host.remove();
  });

  describe("snap-point focus reveal (authored geometry fixture, not a layout engine)", () => {
    const popupTop = 400;
    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    /**
     * Viewport 800px, popup 400px. Popup-relative bands: footer content is pinned to the bottom
     * (320-360px), `straddling-control` crosses the 200px edge and everything else sits at 20-60px.
     */
    function installSnapGeometry(): void {
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
        const slot = this.getAttribute("data-slot");
        if (slot === "drawer-viewport") return 800;
        return slot === "drawer-popup" ? 400 : 40;
      });
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("data-slot") === "drawer-popup") return new DOMRect(0, popupTop, 400, 400);
        if (this.closest('[data-slot="drawer-footer"]')) return new DOMRect(0, popupTop + 320, 120, 40);
        if (this.dataset["testid"] === "straddling-control") return new DOMRect(0, popupTop + 180, 120, 40);
        return new DOMRect(0, popupTop + 20, 120, 40);
      });
      const rect = new DOMRect(0, 0, 120, 40);
      const rects: DOMRectList = {
        0: rect,
        length: 1,
        item: (index) => (index === 0 ? rect : null),
        [Symbol.iterator]: () => [rect][Symbol.iterator](),
      };
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(rects);
    }

    function snapOffset(popup: HTMLElement): string {
      return popup.style.getPropertyValue("--drawer-snap-point-offset");
    }

    it.each([
      {direction: "down", offset: "200px", hidden: "Close snapped drawer", shown: "Top action"},
      {direction: "up", offset: "-200px", hidden: "Top action", shown: "Close snapped drawer"},
    ] as const)(
      "expands an uncontrolled $direction drawer to its largest snap point when focus lands beyond the visible height",
      async ({direction, offset, hidden, shown}) => {
        installSnapGeometry();
        const changes: {value: Drawer.Props["snapPoint"]; reason: string}[] = [];
        render(
          <Drawer
            defaultOpen
            swipeDirection={direction}
            snapPoints={[0.25, 0.5]}
            onSnapPointChange={(value, details) => changes.push({value, reason: details.reason})}>
            <DrawerContent>
              <DrawerTitle>Snap focus drawer</DrawerTitle>
              <button type='button'>Top action</button>
              <DrawerFooter>
                <DrawerClose>Close snapped drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>,
        );
        const popup = await screen.findByRole("dialog", {name: "Snap focus drawer"});
        await waitFor(() => expect(snapOffset(popup)).toBe(offset));
        act(() => screen.getByRole("button", {name: shown}).focus());
        expect(changes).toEqual([]);
        expect(snapOffset(popup)).toBe(offset);
        act(() => screen.getByRole("button", {name: hidden}).focus());
        expect(changes).toEqual([{value: 0.5, reason: "none"}]);
        await waitFor(() => expect(snapOffset(popup)).toBe("0px"));
      },
    );

    it.each([
      {accept: false, offset: "200px"},
      {accept: true, offset: "0px"},
    ] as const)("requests the largest snap point from a controlled owner (accepted=$accept)", async ({accept, offset}) => {
      installSnapGeometry();
      const requests: Drawer.Props["snapPoint"][] = [];
      function ControlledSnapDrawer(): React.ReactElement {
        const [snapPoint, setSnapPoint] = React.useState<Drawer.Props["snapPoint"]>(0.25);
        return (
          <Drawer
            defaultOpen
            snapPoints={[0.25, 0.5]}
            snapPoint={snapPoint}
            onSnapPointChange={(value) => {
              requests.push(value);
              if (accept) setSnapPoint(value);
            }}>
            <DrawerContent>
              <DrawerTitle>Controlled snap focus</DrawerTitle>
              <DrawerFooter>
                <DrawerClose>Close controlled drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        );
      }
      render(<ControlledSnapDrawer />);
      const popup = await screen.findByRole("dialog", {name: "Controlled snap focus"});
      await waitFor(() => expect(snapOffset(popup)).toBe("200px"));
      act(() => screen.getByRole("button", {name: "Close controlled drawer"}).focus());
      expect(requests).toEqual([0.5]);
      await waitFor(() => expect(snapOffset(popup)).toBe(offset));
    });

    it("keeps an uncontrolled snap point when the owner cancels the focus-driven request", async () => {
      installSnapGeometry();
      const requests: Drawer.Props["snapPoint"][] = [];
      render(
        <Drawer
          defaultOpen
          snapPoints={[0.25, 0.5]}
          onSnapPointChange={(value, details) => {
            requests.push(value);
            details.cancel();
          }}>
          <DrawerContent>
            <DrawerTitle>Canceled snap focus</DrawerTitle>
            <DrawerFooter>
              <DrawerClose>Close canceled drawer</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Canceled snap focus"});
      await waitFor(() => expect(snapOffset(popup)).toBe("200px"));
      act(() => screen.getByRole("button", {name: "Close canceled drawer"}).focus());
      expect(requests).toEqual([0.5]);
      expect(snapOffset(popup)).toBe("200px");
    });

    it("does not move a partially visible control that a pointer press focused, but reveals it for keyboard focus", async () => {
      installSnapGeometry();
      const requests: Drawer.Props["snapPoint"][] = [];
      render(
        <Drawer
          defaultOpen
          snapPoints={[0.25, 0.5]}
          onSnapPointChange={(value) => requests.push(value)}>
          <DrawerContent>
            <DrawerTitle>Pressed snap focus</DrawerTitle>
            <button type='button'>Top action</button>
            <button
              type='button'
              data-testid='straddling-control'>
              Edge action
            </button>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Pressed snap focus"});
      await waitFor(() => expect(snapOffset(popup)).toBe("200px"));
      const edge = screen.getByRole("button", {name: "Edge action"});
      const top = screen.getByRole("button", {name: "Top action"});
      fireEvent.pointerDown(edge, {pointerType: "mouse"});
      act(() => edge.focus());
      expect(requests).toEqual([]);
      act(() => top.focus());
      // A press that never focused its control must not exempt a later keyboard focus of that control.
      fireEvent.pointerDown(edge, {pointerType: "mouse"});
      fireEvent.keyDown(top, {key: "Tab"});
      act(() => edge.focus());
      expect(requests).toEqual([0.5]);
      await waitFor(() => expect(snapOffset(popup)).toBe("0px"));
    });

    it("issues exactly one request per focus under Strict Mode ref and effect replay", async () => {
      installSnapGeometry();
      const requests: Drawer.Props["snapPoint"][] = [];
      render(
        <React.StrictMode>
          <Drawer
            defaultOpen
            snapPoints={[0.25, 0.5]}
            onSnapPointChange={(value) => requests.push(value)}>
            <DrawerContent>
              <DrawerTitle>Strict snap focus</DrawerTitle>
              <DrawerFooter>
                <DrawerClose>Close strict drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </React.StrictMode>,
      );
      const popup = await screen.findByRole("dialog", {name: "Strict snap focus"});
      await waitFor(() => expect(snapOffset(popup)).toBe("200px"));
      act(() => screen.getByRole("button", {name: "Close strict drawer"}).focus());
      expect(requests).toEqual([0.5]);
      await waitFor(() => expect(snapOffset(popup)).toBe("0px"));
    });

    it("ignores focus inside a nested, separately portaled drawer", async () => {
      installSnapGeometry();
      const parentRequests: Drawer.Props["snapPoint"][] = [];
      render(
        <Drawer
          defaultOpen
          snapPoints={[0.25, 0.5]}
          onSnapPointChange={(value) => parentRequests.push(value)}>
          <DrawerContent>
            <DrawerTitle>Parent snap drawer</DrawerTitle>
            <Drawer defaultOpen>
              <DrawerContent>
                <DrawerTitle>Nested plain drawer</DrawerTitle>
                <DrawerFooter>
                  <DrawerClose>Close nested plain drawer</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </DrawerContent>
        </Drawer>,
      );
      const parent = await screen.findByRole("dialog", {name: "Parent snap drawer", hidden: true});
      await waitFor(() => expect(snapOffset(parent)).toBe("200px"));
      const nestedClose = await screen.findByRole("button", {name: "Close nested plain drawer"});
      expect(parent).not.toContainElement(nestedClose);
      act(() => nestedClose.focus());
      expect(parentRequests).toEqual([]);
      expect(snapOffset(parent)).toBe("200px");
    });

    it.each([
      {label: "without snap points", snapPoints: undefined, swipeDirection: "down"},
      {label: "on a horizontal axis", snapPoints: [0.25, 0.5], swipeDirection: "right"},
    ] as const)("never requests a snap point $label", async ({snapPoints, swipeDirection}) => {
      installSnapGeometry();
      const requests: Drawer.Props["snapPoint"][] = [];
      render(
        <Drawer
          defaultOpen
          swipeDirection={swipeDirection}
          snapPoints={snapPoints === undefined ? undefined : [...snapPoints]}
          onSnapPointChange={(value) => requests.push(value)}>
          <DrawerContent>
            <DrawerTitle>Unsnapped focus</DrawerTitle>
            <DrawerFooter>
              <DrawerClose>Close unsnapped drawer</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>,
      );
      const popup = await screen.findByRole("dialog", {name: "Unsnapped focus"});
      act(() => screen.getByRole("button", {name: "Close unsnapped drawer"}).focus());
      expect(requests).toEqual([]);
      expect(snapOffset(popup)).toBe("0px");
    });

    it("reveals the SnapPoints story's footer Close when keyboard focus reaches it at the smallest snap point", async () => {
      installSnapGeometry();
      const user = userEvent.setup();
      render(<SnapPointsStory />);
      await user.click(screen.getByRole("button", {name: "Open snapping drawer"}));
      const popup = await screen.findByRole("dialog", {name: "Snap points"});
      await waitFor(() => expect(snapOffset(popup)).toBe("120px"));
      expect(screen.getByRole("status")).toHaveTextContent("Active snap: 0.35");
      await user.tab();
      expect(screen.getByRole("button", {name: "35%"})).toHaveFocus();
      expect(snapOffset(popup)).toBe("120px");
      await user.tab();
      await user.tab();
      await user.tab();
      expect(screen.getByRole("button", {name: "Close"})).toHaveFocus();
      expect(screen.getByRole("status")).toHaveTextContent("Active snap: 1");
      await waitFor(() => expect(snapOffset(popup)).toBe("0px"));
    });

    // Snap points [0.125, 0.25, 0.5] resolve to 100/200/400px of the 800px viewport: offsets 300/200/0px.
    it.each([
      {
        label: "without defaultSnapPoint",
        defaultSnapPoint: undefined,
        cancelReset: false,
        opened: {value: 0.125, offset: "300px"},
        swiped: {from: 350, to: 250, value: 0.25, offset: "200px"},
        reopened: "300px",
      },
      {
        label: "with defaultSnapPoint",
        defaultSnapPoint: 0.25,
        cancelReset: false,
        opened: {value: 0.25, offset: "200px"},
        swiped: {from: 250, to: 350, value: 0.125, offset: "300px"},
        reopened: "200px",
      },
      {
        label: "when the owner cancels the close reset",
        defaultSnapPoint: 0.25,
        cancelReset: true,
        opened: {value: 0.25, offset: "200px"},
        swiped: {from: 250, to: 350, value: 0.125, offset: "300px"},
        reopened: "0px",
      },
    ] as const)(
      "resets wrapper-owned uncontrolled snap state through Base UI's close request ($label)",
      async ({defaultSnapPoint, cancelReset, opened, swiped, reopened}) => {
        installSnapGeometry();
        vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
        // Only hit testing is a double: drags land on whichever popup is currently mounted.
        vi.spyOn(document, "elementFromPoint").mockImplementation(() => document.querySelector('[data-slot="drawer-popup"]'));
        const user = userEvent.setup();
        const changes: {value: Drawer.Props["snapPoint"]; reason: string}[] = [];
        render(
          <Drawer
            snapPoints={[0.125, 0.25, 0.5]}
            defaultSnapPoint={defaultSnapPoint}
            snapToSequentialPoints
            onSnapPointChange={(value, details) => {
              changes.push({value, reason: details.reason});
              if (cancelReset && details.reason === "escape-key") details.cancel();
            }}>
            <DrawerTrigger>Open resettable drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerTitle>Resettable snap drawer</DrawerTitle>
              <DrawerFooter>
                <DrawerClose>Close resettable drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>,
        );
        const trigger = screen.getByRole("button", {name: "Open resettable drawer"});
        await user.click(trigger);
        const popup = await screen.findByRole("dialog", {name: "Resettable snap drawer"});
        await waitFor(() => expect(snapOffset(popup)).toBe(opened.offset));
        expect(changes).toEqual([]);

        // Base UI-originated change: a slow drag on the popup settles on the adjacent snap point.
        dispatchPointer(popup, "pointerdown", 100, swiped.from, 100);
        dispatchPointer(popup, "pointermove", 100, swiped.from, 120);
        dispatchPointer(popup, "pointermove", 100, swiped.to, 820);
        dispatchPointer(popup, "pointerup", 100, swiped.to, 920);
        await waitFor(() => expect(snapOffset(popup)).toBe(swiped.offset));

        // Wrapper-originated change: keyboard focus in the off-screen footer band expands to the largest snap point.
        act(() => screen.getByRole("button", {name: "Close resettable drawer"}).focus());
        await waitFor(() => expect(snapOffset(popup)).toBe("0px"));

        await user.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("dialog", {name: "Resettable snap drawer"})).not.toBeInTheDocument());
        expect(changes).toEqual([
          {value: swiped.value, reason: "swipe"},
          {value: 0.5, reason: "none"},
          {value: opened.value, reason: "escape-key"},
        ]);

        await user.click(trigger);
        const reopenedPopup = await screen.findByRole("dialog", {name: "Resettable snap drawer"});
        await waitFor(() => expect(snapOffset(reopenedPopup)).toBe(reopened));
        expect(changes).toHaveLength(3);
      },
    );
  });
});
import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
