import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse, type AnyNode} from "postcss";
import * as React from "react";
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

  it("renders DrawerHeader with asChild prop and valid element", async () => {
    // Arrange
    const {DrawerHeader} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader
            asChild
            data-testid='drawer-header'>
            <header>Custom Header</header>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );

    // Assert
    const header = await screen.findByTestId("drawer-header");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("HEADER");
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("renders DrawerFooter with asChild prop and valid element", async () => {
    // Arrange
    const {DrawerFooter} = await import("./drawer");

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
          <DrawerFooter
            asChild
            data-testid='drawer-footer'>
            <footer>Custom Footer</footer>
          </DrawerFooter>
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
});
import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
