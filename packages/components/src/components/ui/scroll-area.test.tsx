import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createRef} from "react";
import {hydrateRoot, type Root} from "react-dom/client";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaThumb,
  ScrollAreaViewport,
  ScrollBar,
} from "./scroll-area";
import styles from "./scroll-area.module.css";

const platformDescriptors = new Map<string, PropertyDescriptor | undefined>();
const platformMethods = ["getAnimations", "setPointerCapture", "hasPointerCapture", "releasePointerCapture"] as const;
// Lets one viewport switch between fitting and overflowing content within a test.
let resizingContentOverflows = false;
let moduleStylesheet: HTMLStyleElement | undefined;

/** Applies the real stylesheet against the CSS Module class names emitted by Vitest. */
function mountModuleStylesheet(): void {
  moduleStylesheet = document.createElement("style");
  moduleStylesheet.textContent = readFileSync(join(import.meta.dirname, "scroll-area.module.css"), "utf8").replace(
    /\.([a-zA-Z][\w-]*)/gu,
    (_match, name: string) => `.${styles[name] ?? name}`,
  );
  document.head.append(moduleStylesheet);
}

function cssPixels(value: string): number {
  const match = /^(-?\d*\.?\d+)(px|rem)$/u.exec(value.trim());
  if (!match) throw new Error(`Unsupported CSS length "${value}"`);
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

function mountedScrollbar(root: HTMLElement, orientation: "vertical" | "horizontal"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement
      && child.getAttribute("data-slot") === "scroll-area-scrollbar"
      && child.getAttribute("data-orientation") === orientation,
  );
}

function reservedInlineEnd(viewport: HTMLElement): number {
  const gutter = getComputedStyle(viewport).getPropertyValue("padding-inline-end");
  return gutter === "" ? 0 : cssPixels(gutter);
}

// Captures the primitive's resize observers so a test can deliver resize observations on demand.
const resizeDeliveries = new Set<() => void>();
class CapturingResizeObserver implements ResizeObserver {
  private readonly deliver: () => void;

  constructor(callback: ResizeObserverCallback) {
    this.deliver = (): void => callback([], this);
  }

  observe(): void {
    resizeDeliveries.add(this.deliver);
  }

  unobserve(): void {
    resizeDeliveries.delete(this.deliver);
  }

  disconnect(): void {
    resizeDeliveries.delete(this.deliver);
  }
}

describe("ScrollArea", () => {
  beforeEach(() => {
    resizingContentOverflows = false;
    for (const name of platformMethods) {
      platformDescriptors.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
    }
    const captures = new Set<number>();
    Object.defineProperties(HTMLElement.prototype, {
      getAnimations: {configurable: true, value: (): Animation[] => []},
      setPointerCapture: {
        configurable: true,
        value: (id: number): void => {
          captures.add(id);
        },
      },
      hasPointerCapture: {configurable: true, value: (id: number): boolean => captures.has(id)},
      releasePointerCapture: {
        configurable: true,
        value: (id: number): void => {
          captures.delete(id);
        },
      },
    });
    for (const property of ["clientHeight", "clientWidth", "scrollHeight", "scrollWidth", "offsetHeight", "offsetWidth"] as const) {
      vi.spyOn(HTMLElement.prototype, property, "get").mockImplementation(function (this: HTMLElement): number {
        const testId = this.getAttribute("data-testid");
        if (testId === "scroll-viewport" || this.id === "scroll-viewport") {
          if (property === "scrollHeight") return 400;
          if (property === "scrollWidth") return 300;
          return 100;
        }
        if (testId === "resizing-viewport") {
          return property === "scrollHeight" && resizingContentOverflows ? 400 : 100;
        }
        if (this.id === "aspect-viewport") {
          // Width-proportional media: 101px tall at the full 100px width, 77px once a 24px gutter narrows it.
          if (property !== "scrollHeight") return 100;
          return reservedInlineEnd(this) > 0 ? 77 : 101;
        }
        if (testId === "scroll-bar" || testId === "horizontal-bar") return 100;
        if (this.getAttribute("data-slot") === "scroll-area-thumb") return 25;
        return 0;
      });
    }
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement): DOMRect {
      return new DOMRect(0, 0, this.offsetWidth, this.offsetHeight);
    });
  });

  afterEach(() => {
    cleanup();
    moduleStylesheet?.remove();
    moduleStylesheet = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resizeDeliveries.clear();
    for (const name of platformMethods) {
      const descriptor = platformDescriptors.get(name);
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, name);
    }
    platformDescriptors.clear();
  });

  it("forwards actual primitive root state, class callbacks, render callbacks and merged element refs", async () => {
    const rootRef = createRef<HTMLDivElement>();
    const renderRef = createRef<HTMLDivElement>();
    const viewportRef = createRef<HTMLDivElement>();
    const {rerender} = render(
      <ScrollArea
        ref={rootRef}
        className={(state) => (state.hasOverflowY ? "overflowing" : "fitting")}
        viewportProps={{ref: viewportRef, id: "scroll-viewport", "aria-label": "Notes"}}
        render={(props, state) => (
          <section
            {...props}
            data-testid='scroll-root'
            data-overflow={String(state.hasOverflowY)}
          />
        )}>
        <p>Scrollable notes</p>
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId("scroll-root")).toHaveAttribute("data-overflow", "true"));
    expect(rootRef.current).toBe(screen.getByTestId("scroll-root"));
    expect(rootRef.current).toHaveClass("overflowing");
    expect(viewportRef.current).toHaveAttribute("id", "scroll-viewport");
    expect(viewportRef.current).toHaveAttribute("tabindex", "0");
    viewportRef.current?.focus();
    expect(viewportRef.current).toHaveFocus();
    expect(screen.getByText("Scrollable notes").parentElement).toHaveAttribute("data-slot", "scroll-area-content");
    rerender(
      <ScrollArea
        ref={rootRef}
        render={<div ref={renderRef} />}>
        Content
      </ScrollArea>,
    );
    expect(rootRef.current).toBe(renderRef.current);
  });

  it("keeps the viewport out of tab order when supplied dimensions have no overflow", async () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(<ScrollArea viewportProps={{ref: viewportRef, "aria-label": "Short notes"}}>Short content</ScrollArea>);
    await waitFor(() => expect(viewportRef.current).toHaveAttribute("tabindex", "-1"));
  });

  it("keeps real parts and refs connected and updates wrapper state after a caller scroll request", async () => {
    const viewportRef = createRef<HTMLDivElement>();
    const contentRef = createRef<HTMLDivElement>();
    const barRef = createRef<HTMLDivElement>();
    const thumbRef = createRef<HTMLDivElement>();
    const cornerRef = createRef<HTMLDivElement>();
    render(
      <ScrollAreaRoot
        data-testid='scroll-root'
        className={(state) => (state.overflowYStart ? "past-start" : "at-start")}
        render={(props, state) => (
          <div
            {...props}
            data-past-start={String(state.overflowYStart)}
          />
        )}>
        <ScrollAreaViewport
          ref={viewportRef}
          data-testid='scroll-viewport'
          aria-label='Notes'
          className={(state) => (state.hasOverflowY ? "overflowing-viewport" : "fitting-viewport")}
          render={(props, state) => (
            <div
              {...props}
              data-overflow={String(state.hasOverflowY)}
            />
          )}>
          <ScrollAreaContent
            ref={contentRef}
            className={(state) => (state.hasOverflowY ? "overflowing-content" : "fitting-content")}
            render={(props, state) => (
              <div
                {...props}
                data-overflow={String(state.hasOverflowY)}
              />
            )}>
            Notes
          </ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar
          ref={barRef}
          data-testid='scroll-bar'
          className={(state) => `axis-${state.orientation}`}
          render={(props, state) => (
            <div
              {...props}
              data-axis={state.orientation}
            />
          )}>
          <ScrollAreaThumb
            ref={thumbRef}
            className={(state) => `thumb-${state.orientation}`}
            render={(props, state) => (
              <div
                {...props}
                data-axis={state.orientation}
              />
            )}
          />
        </ScrollBar>
        <ScrollBar
          orientation='horizontal'
          data-testid='horizontal-bar'
          keepMounted
        />
        <ScrollAreaCorner
          ref={cornerRef}
          className={() => "custom-corner"}
          render={<div title='Scrollbar intersection' />}
        />
      </ScrollAreaRoot>,
    );
    await waitFor(() => expect(barRef.current).toHaveAttribute("data-axis", "vertical"));
    expect(barRef.current).toHaveClass("axis-vertical");
    expect(thumbRef.current).toHaveAttribute("data-slot", "scroll-area-thumb");
    expect(thumbRef.current).toHaveAttribute("data-axis", "vertical");
    expect(thumbRef.current).toHaveClass("thumb-vertical");
    expect(cornerRef.current).toHaveAttribute("data-slot", "scroll-area-corner");
    expect(cornerRef.current).toHaveClass("custom-corner");
    expect(cornerRef.current).toHaveAttribute("title", "Scrollbar intersection");
    expect(contentRef.current?.parentElement).toBe(viewportRef.current);
    expect(viewportRef.current).toHaveClass("overflowing-viewport");
    expect(contentRef.current).toHaveClass("overflowing-content");
    expect(viewportRef.current).toHaveAttribute("data-overflow", "true");
    expect(contentRef.current).toHaveAttribute("data-overflow", "true");
    const viewport = viewportRef.current;
    if (!viewport) throw new Error("Missing viewport ref");
    vi.spyOn(viewport, "scrollTo").mockImplementation((options?: number | ScrollToOptions): void => {
      if (typeof options === "object") {
        viewport.scrollTop = options.top ?? viewport.scrollTop;
        viewport.scrollLeft = options.left ?? viewport.scrollLeft;
      }
    });
    act(() => {
      viewport.scrollTo({top: 120, left: 40});
      fireEvent.scroll(viewport);
    });
    await waitFor(() => expect(screen.getByTestId("scroll-root")).toHaveAttribute("data-past-start", "true"));
    expect(screen.getByTestId("scroll-root")).toHaveClass("past-start");
    expect(viewport.scrollTop).toBe(120);
    expect(viewport.scrollLeft).toBe(40);
  });

  it("routes wheel, track and thumb pointer requests to the actual viewport and preserves cancellation", async () => {
    const viewportRef = createRef<HTMLDivElement>();
    const barRef = createRef<HTMLDivElement>();
    const thumbRef = createRef<HTMLDivElement>();
    render(
      <ScrollAreaRoot>
        <ScrollAreaViewport
          ref={viewportRef}
          data-testid='scroll-viewport'>
          <ScrollAreaContent>Notes</ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar
          ref={barRef}
          data-testid='scroll-bar'
          keepMounted>
          <ScrollAreaThumb
            ref={thumbRef}
            data-testid='scroll-thumb'
          />
        </ScrollBar>
      </ScrollAreaRoot>,
    );
    await waitFor(() => expect(screen.getByTestId("scroll-viewport")).toHaveAttribute("tabindex", "0"));
    const viewport = viewportRef.current;
    const bar = barRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !bar || !thumb) throw new Error("Missing scroll part refs");
    // Happy DOM has no stylesheet layout. Supply the logical offsets used by the primitive's pointer math.
    bar.style.paddingBlockStart = "0px";
    bar.style.paddingBlockEnd = "0px";
    thumb.style.marginBlockStart = "0px";
    thumb.style.marginBlockEnd = "0px";
    fireEvent.wheel(bar, {deltaY: 30});
    expect(viewport.scrollTop).toBe(30);
    fireEvent.pointerDown(bar, {button: 0, buttons: 1, pointerId: 1, clientY: 50});
    expect(viewport.scrollTop).toBe(150);
    fireEvent.pointerUp(bar, {pointerId: 1});
    viewport.scrollTop = 0;
    fireEvent.pointerDown(thumb, {button: 0, buttons: 1, pointerId: 2, clientY: 0});
    fireEvent.pointerMove(thumb, {buttons: 1, pointerId: 2, clientY: 25});
    expect(viewport.scrollTop).toBe(100);
    fireEvent.pointerCancel(thumb, {pointerId: 2});
    fireEvent.pointerMove(thumb, {buttons: 1, pointerId: 2, clientY: 50});
    expect(viewport.scrollTop).toBe(100);
  });

  it("reserves an inline-end gutter matching the mounted 24px vertical track and no block-end gutter without a horizontal track", async () => {
    mountModuleStylesheet();
    const rootRef = createRef<HTMLDivElement>();
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ScrollArea
        ref={rootRef}
        viewportProps={{ref: viewportRef, id: "scroll-viewport", "aria-label": "Notes"}}>
        <p>Scrollable notes</p>
      </ScrollArea>,
    );
    await waitFor(() => expect(rootRef.current).toHaveAttribute("data-has-overflow-y"));
    const root = rootRef.current;
    const viewport = viewportRef.current;
    if (!root || !viewport) throw new Error("Missing scroll area refs");
    const verticalTrack = mountedScrollbar(root, "vertical");
    if (!verticalTrack) throw new Error("Missing mounted vertical track");
    const viewportStyle = getComputedStyle(viewport);

    // The overlaid track keeps its 24px target, and the viewport reserves exactly that band.
    expect(cssPixels(getComputedStyle(verticalTrack).width)).toBe(24);
    expect(viewportStyle.boxSizing).toBe("border-box");
    expect(cssPixels(viewportStyle.getPropertyValue("padding-inline-end"))).toBe(24);
    expect(cssPixels(viewportStyle.getPropertyValue("scroll-padding-inline-end"))).toBe(24);
    // Base UI also reports x overflow, but this convenience root mounts no horizontal track to reserve space for.
    expect(root).toHaveAttribute("data-has-overflow-x");
    expect(mountedScrollbar(root, "horizontal")).toBeUndefined();
    expect(viewportStyle.getPropertyValue("padding-block-end")).toBe("");
    expect(viewportStyle.getPropertyValue("scroll-padding-block-end")).toBe("");
  });

  it("reserves a block-end gutter matching the mounted 24px horizontal track and no inline-end gutter without a vertical track", async () => {
    mountModuleStylesheet();
    render(
      <ScrollAreaRoot data-testid='scroll-root'>
        <ScrollAreaViewport
          data-testid='scroll-viewport'
          aria-label='Wide notes'>
          <ScrollAreaContent>Wide notes</ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar orientation='horizontal' />
        <ScrollAreaCorner />
      </ScrollAreaRoot>,
    );
    const root = screen.getByTestId("scroll-root");
    await waitFor(() => expect(root).toHaveAttribute("data-has-overflow-x"));
    const horizontalTrack = mountedScrollbar(root, "horizontal");
    if (!horizontalTrack) throw new Error("Missing mounted horizontal track");
    const viewportStyle = getComputedStyle(screen.getByTestId("scroll-viewport"));

    expect(root).toHaveAttribute("data-has-overflow-x");
    expect(cssPixels(getComputedStyle(horizontalTrack).height)).toBe(24);
    expect(cssPixels(viewportStyle.getPropertyValue("padding-block-end"))).toBe(24);
    expect(cssPixels(viewportStyle.getPropertyValue("scroll-padding-block-end"))).toBe(24);
    // y overflows as well, but without a mounted vertical track there is no inline-end band to reserve.
    expect(root).toHaveAttribute("data-has-overflow-y");
    expect(viewportStyle.getPropertyValue("padding-inline-end")).toBe("");
  });

  it("keeps the gutter stable while Base UI toggles overflow, hiding the kept-mounted track while its axis fits", async () => {
    mountModuleStylesheet();
    render(
      <ScrollAreaRoot data-testid='scroll-root'>
        <ScrollAreaViewport
          data-testid='resizing-viewport'
          aria-label='Notes'>
          <ScrollAreaContent>Notes</ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollAreaRoot>,
    );
    const root = screen.getByTestId("scroll-root");
    const viewport = screen.getByTestId("resizing-viewport");
    // Base UI publishes its overflow edge variables only after measuring real content.
    await waitFor(() => expect(viewport.style.getPropertyValue("--scroll-area-overflow-y-end")).toBe("0px"));
    // A composed ScrollBar stays mounted by default: the gutter is reserved although nothing overflows, and the idle
    // track is hidden, so it paints nothing and is no pointer target.
    const track = mountedScrollbar(root, "vertical");
    if (!track) throw new Error("Missing kept-mounted vertical track");
    expect(root).not.toHaveAttribute("data-has-overflow-y");
    expect(getComputedStyle(track).visibility).toBe("hidden");
    expect(reservedInlineEnd(viewport)).toBe(24);

    resizingContentOverflows = true;
    act(() => {
      fireEvent.scroll(viewport);
    });
    await waitFor(() => expect(root).toHaveAttribute("data-has-overflow-y"));
    expect(mountedScrollbar(root, "vertical")).toBe(track);
    expect(getComputedStyle(track).visibility).not.toBe("hidden");
    expect(reservedInlineEnd(viewport)).toBe(24);

    resizingContentOverflows = false;
    act(() => {
      fireEvent.scroll(viewport);
    });
    await waitFor(() => expect(root).not.toHaveAttribute("data-has-overflow-y"));
    expect(mountedScrollbar(root, "vertical")).toBe(track);
    expect(getComputedStyle(track).visibility).toBe("hidden");
    expect(reservedInlineEnd(viewport)).toBe(24);
  });

  it("settles width-dependent content instead of flip-flopping Base UI's overflow measurement", async () => {
    mountModuleStylesheet();
    vi.stubGlobal("ResizeObserver", CapturingResizeObserver);
    render(
      <ScrollArea
        data-testid='aspect-root'
        viewportProps={{id: "aspect-viewport", "aria-label": "Media"}}>
        <p>Aspect-ratio media</p>
      </ScrollArea>,
    );
    const root = screen.getByTestId("aspect-root");
    const viewport = document.getElementById("aspect-viewport");
    if (!viewport) throw new Error("Missing aspect viewport");
    let attributeChanges = 0;
    const mutations = new MutationObserver((records) => {
      attributeChanges += records.length;
    });
    mutations.observe(root, {attributes: true, attributeFilter: ["data-has-overflow-y"]});
    const observed: boolean[] = [];
    for (let observation = 0; observation < 6; observation++) {
      act(() => {
        for (const deliver of resizeDeliveries) deliver();
      });
      // Let re-measurements the primitive schedules after a state change run (outside act, like later frames).
      await waitFor(() => undefined);
      observed.push(root.hasAttribute("data-has-overflow-y"));
    }
    mutations.disconnect();

    expect(new Set(observed).size, `overflow per observation: ${observed.join(", ")}`).toBe(1);
    expect(attributeChanges).toBeLessThanOrEqual(1);
    expect(reservedInlineEnd(viewport)).toBe(24);
  });

  it("server-renders the convenience ScrollArea with its gutter reserved and hydrates without a mismatch", async () => {
    mountModuleStylesheet();
    const ui = (
      <ScrollArea viewportProps={{id: "ssr-viewport", "aria-label": "Server notes"}}>
        <p>Server notes</p>
      </ScrollArea>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    const viewport = container.querySelector<HTMLElement>("#ssr-viewport");
    const serverRoot = viewport?.parentElement;
    if (!viewport || !serverRoot) throw new Error("Missing server-rendered scroll area");
    // Before any client code runs, the server markup carries the hidden track and therefore the gutter.
    const serverTrack = mountedScrollbar(serverRoot, "vertical");
    expect(serverTrack).toBeDefined();
    if (serverTrack) expect(getComputedStyle(serverTrack).visibility).toBe("hidden");
    expect(reservedInlineEnd(viewport)).toBe(24);

    const consoleError = vi.spyOn(console, "error");
    const onRecoverableError = vi.fn();
    let hydrated: Root | undefined;
    await act(async () => {
      hydrated = hydrateRoot(container, ui, {onRecoverableError});
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector("#ssr-viewport")).toBe(viewport);
    expect(mountedScrollbar(serverRoot, "vertical")).toBe(serverTrack);
    expect(reservedInlineEnd(viewport)).toBe(24);
    act(() => hydrated?.unmount());
    container.remove();
  });

  it("lets a composed track opt out with keepMounted={false}, leaving no track or gutter while its axis fits", async () => {
    mountModuleStylesheet();
    render(
      <ScrollAreaRoot data-testid='scroll-root'>
        <ScrollAreaViewport
          data-testid='resizing-viewport'
          aria-label='Notes'>
          <ScrollAreaContent>Notes</ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar keepMounted={false} />
      </ScrollAreaRoot>,
    );
    const viewport = screen.getByTestId("resizing-viewport");
    await waitFor(() => expect(viewport.style.getPropertyValue("--scroll-area-overflow-y-end")).toBe("0px"));
    expect(mountedScrollbar(screen.getByTestId("scroll-root"), "vertical")).toBeUndefined();
    expect(reservedInlineEnd(viewport)).toBe(0);
  });
});
it("refresh accessibility: authors 24px custom scroll targets and a contrasting thumb", () => {
  const css = readFileSync(join(import.meta.dirname, "scroll-area.module.css"), "utf8");
  expect(css).toMatch(/\.vertical\s*\{[^}]*width:\s*1\.5rem/u);
  expect(css).toMatch(/\.horizontal\s*\{[^}]*height:\s*1\.5rem/u);
  expect(css).toMatch(/\.thumb::before\s*\{[^}]*background-color:\s*var\(--ac-input\)/u);
});
