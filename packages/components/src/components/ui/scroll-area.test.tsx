import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {createRef} from "react";
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

const platformDescriptors = new Map<string, PropertyDescriptor | undefined>();
const platformMethods = ["getAnimations", "setPointerCapture", "hasPointerCapture", "releasePointerCapture"] as const;

describe("ScrollArea", () => {
  beforeEach(() => {
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
    vi.restoreAllMocks();
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
});
