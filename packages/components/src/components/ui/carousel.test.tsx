import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import * as CarouselModule from "./carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
  type CarouselOptions,
  type CarouselPlugin,
  type CarouselProps,
} from "./carousel";

const slideSize = 320;
type Controls = Readonly<{
  previous?: React.ComponentPropsWithRef<typeof CarouselPrevious>;
  next?: React.ComponentPropsWithRef<typeof CarouselNext>;
}>;
type FixtureProps = Readonly<React.ComponentPropsWithRef<typeof Carousel>>;

function fixtureOffset(element: HTMLElement, property: "offsetWidth" | "offsetHeight" | "offsetLeft" | "offsetTop"): number | undefined {
  const isTrack = element.dataset["testid"] === "carousel-track";
  const index = element.dataset["fixtureIndex"];
  if (!isTrack && index === undefined) return undefined;
  if (property === "offsetWidth" || property === "offsetHeight") return slideSize;
  const vertical = element.closest("[data-orientation]")?.getAttribute("data-orientation") === "vertical";
  const alongAxis = vertical ? property === "offsetTop" : property === "offsetLeft";
  return !isTrack && alongAxis ? Number(index) * slideSize : 0;
}

function measuredSlides(count = 3, firstRef?: React.RefObject<HTMLDivElement | null>): React.ReactElement[] {
  return Array.from({length: count}, (_, index) => (
    <CarouselItem
      key={index}
      data-fixture-index={index}
      className='consumer-slide'
      ref={(element) => {
        element?.style.setProperty("margin-right", "0px");
        element?.style.setProperty("margin-bottom", "0px");
        if (index === 0 && firstRef) firstRef.current = element;
      }}>
      <button type='button'>Slide {index + 1}</button>
    </CarouselItem>
  ));
}

function renderCarousel(
  props: FixtureProps = {},
  controls: Controls = {},
): ReturnType<typeof render> & {
  readonly api: () => CarouselApi;
  readonly renderAgain: (nextProps: FixtureProps, nextControls?: Controls) => void;
} {
  let initializedApi: CarouselApi | undefined;
  const content = (currentProps: FixtureProps, currentControls: Controls): React.ReactElement => (
    <Carousel
      {...currentProps}
      setApi={(api) => {
        initializedApi = api;
        currentProps.setApi?.(api);
      }}>
      <CarouselContent
        data-testid='carousel-track'
        className='consumer-track'>
        {measuredSlides()}
      </CarouselContent>
      <CarouselPrevious {...currentControls.previous} />
      <CarouselNext {...currentControls.next} />
      {currentProps.children}
    </Carousel>
  );
  const result = render(content(props, controls));

  return {
    ...result,
    renderAgain: (nextProps, nextControls = controls) => result.rerender(content(nextProps, nextControls)),
    api: () => {
      if (!initializedApi) throw new Error("Measured Embla viewport did not initialize");
      return initializedApi;
    },
  };
}

function ContextControls(): React.ReactElement {
  const {api, orientation, canScrollPrev, canScrollNext, scrollPrev, scrollNext} = useCarousel();
  return (
    <>
      <output aria-label='Carousel context'>{`${orientation}:${api ? "ready" : "pending"}:${String(canScrollPrev)}:${String(canScrollNext)}`}</output>
      <button
        type='button'
        onClick={scrollPrev}>
        Custom previous
      </button>
      <button
        type='button'
        onClick={scrollNext}>
        Custom next
      </button>
    </>
  );
}

const platformGetters = ["offsetWidth", "offsetHeight", "offsetLeft", "offsetTop"] as const;
const originalDescriptors = platformGetters.map(
  (property) => [property, Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)] as const,
);

describe("Carousel with the installed Embla engine", () => {
  beforeEach(() => {
    for (const property of platformGetters) {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)?.get;
      if (!original) throw new Error(`Missing platform getter: ${property}`);
      vi.spyOn(HTMLElement.prototype, property, "get").mockImplementation(function (this: HTMLElement): number {
        return fixtureOffset(this, property) ?? original.call(this);
      });
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    for (const [property, descriptor] of originalDescriptors) {
      expect(Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)).toEqual(descriptor);
    }
  });

  it("uses horizontal keys by default from focusable slide content and requests the next measured snap", () => {
    const {api} = renderCarousel();
    const firstSlide = screen.getByRole("button", {name: "Slide 1"});
    const key = new KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true, cancelable: true});
    firstSlide.focus();

    expect(api().slideNodes()).toHaveLength(3);
    expect(api().internalEngine().containerRect.width).toBe(320);
    expect(
      api()
        .internalEngine()
        .slideRects.map((rect) => rect.left),
    ).toEqual([0, 320, 640]);
    expect(api().scrollSnapList()).toEqual([-0, 0.5, 1]);
    expect(api().selectedScrollSnap()).toBe(0);
    expect(api().internalEngine().target.get()).toBeCloseTo(0);
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeEnabled();

    act(() => firstSlide.dispatchEvent(key));

    expect(key.defaultPrevented).toBe(true);
    expect(api().selectedScrollSnap()).toBe(1);
    expect(api().internalEngine().target.get()).toBe(-320);
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeEnabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeEnabled();

    fireEvent.keyDown(firstSlide, {key: "ArrowLeft"});
    expect(api().selectedScrollSnap()).toBe(0);
    expect(api().internalEngine().target.get()).toBeCloseTo(0);
  });

  it("exports the guarded hook for custom controls as the sixth runtime export", () => {
    expect(CarouselModule).toHaveProperty("useCarousel", expect.any(Function));
    expect(Object.keys(CarouselModule)).toHaveLength(6);
  });

  it("merges consumer capture handlers without losing horizontal navigation", () => {
    const onKeyDownCapture = vi.fn();
    const {api} = renderCarousel({onKeyDownCapture});
    fireEvent.keyDown(screen.getByRole("button", {name: "Slide 1"}), {key: "ArrowRight"});
    expect(onKeyDownCapture).toHaveBeenCalledTimes(1);
    expect(api().selectedScrollSnap()).toBe(1);
    expect(api().internalEngine().target.get()).toBe(-320);
  });

  it.each(["previous", "next"] as const)("honors preventDefault on %s navigation without swallowing the consumer click", (control) => {
    const onClick = vi.fn((event: React.MouseEvent<HTMLElement>) => event.preventDefault());
    const {api} = renderCarousel({opts: {startIndex: 1}}, {[control]: {onClick}});
    fireEvent.click(screen.getByRole("button", {name: control === "next" ? "Next slide" : "Previous slide"}));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(api().selectedScrollSnap()).toBe(1);
    expect(api().internalEngine().target.get()).toBe(-320);
  });

  it("cannot enable a non-looping end with disabled=false", () => {
    const {api} = renderCarousel({}, {previous: {disabled: false}, next: {disabled: false}});
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeDisabled();
    act(() => api().scrollTo(2, true));
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
  });

  it("uses the reviewed icon-sm Button preset and owns compound data slots", () => {
    renderCarousel();
    expect(screen.getByRole("region")).toHaveAttribute("data-slot", "carousel");
    expect(screen.getAllByRole("group")[0]).toHaveAttribute("data-slot", "carousel-item");
    expect(screen.getByRole("button", {name: "Previous slide"})).toHaveAttribute("data-slot", "carousel-previous");
    expect(screen.getByRole("button", {name: "Next slide"})).toHaveAttribute("data-slot", "carousel-next");
    expect(screen.getByRole("button", {name: "Previous slide"})).toHaveAttribute("data-size", "icon-sm");
    expect(screen.getByRole("button", {name: "Next slide"})).toHaveAttribute("data-size", "icon-sm");
  });

  it.each([
    {
      name: "explicit horizontal",
      props: {orientation: "horizontal"},
      axis: "x",
      orientation: "horizontal",
      next: "ArrowRight",
      previous: "ArrowLeft",
      ignored: "ArrowDown",
    },
    {
      name: "explicit vertical",
      props: {orientation: "vertical"},
      axis: "y",
      orientation: "vertical",
      next: "ArrowDown",
      previous: "ArrowUp",
      ignored: "ArrowRight",
    },
    {
      name: "opts.axis=x",
      props: {opts: {axis: "x"}},
      axis: "x",
      orientation: "horizontal",
      next: "ArrowRight",
      previous: "ArrowLeft",
      ignored: "ArrowUp",
    },
    {
      name: "opts.axis=y",
      props: {opts: {axis: "y"}},
      axis: "y",
      orientation: "vertical",
      next: "ArrowDown",
      previous: "ArrowUp",
      ignored: "ArrowLeft",
    },
    {
      name: "horizontal overrides y",
      props: {orientation: "horizontal", opts: {axis: "y"}},
      axis: "x",
      orientation: "horizontal",
      next: "ArrowRight",
      previous: "ArrowLeft",
      ignored: "ArrowDown",
    },
    {
      name: "vertical overrides x",
      props: {orientation: "vertical", opts: {axis: "x"}},
      axis: "y",
      orientation: "vertical",
      next: "ArrowDown",
      previous: "ArrowUp",
      ignored: "ArrowRight",
    },
  ] satisfies ReadonlyArray<{
    name: string;
    props: CarouselProps;
    axis: string;
    orientation: string;
    next: string;
    previous: string;
    ignored: string;
  }>)("keeps $name consistent across the engine, layout, context and keys", ({props, axis, orientation, next, previous, ignored}) => {
    const {api} = renderCarousel({...props, children: <ContextControls />});
    expect(api().internalEngine().options.axis).toBe(axis);
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("data-orientation", orientation);
    for (const element of region.querySelectorAll("[data-slot^='carousel-']")) {
      expect(element).toHaveAttribute("data-orientation", orientation);
    }
    expect(screen.getByLabelText("Carousel context")).toHaveTextContent(`${orientation}:ready:false:true`);
    const button = screen.getByRole("button", {name: "Slide 1"});
    const ignoredEvent = new KeyboardEvent("keydown", {key: ignored, bubbles: true, cancelable: true});
    act(() => button.dispatchEvent(ignoredEvent));
    expect(ignoredEvent.defaultPrevented).toBe(false);
    expect(api().selectedScrollSnap()).toBe(0);
    fireEvent.keyDown(button, {key: next});
    expect(api().selectedScrollSnap()).toBe(1);
    expect(api().internalEngine().target.get()).toBe(-320);
    expect(screen.getByLabelText("Carousel context")).toHaveTextContent(`${orientation}:ready:true:true`);
    fireEvent.keyDown(button, {key: previous});
    expect(api().selectedScrollSnap()).toBe(0);
    expect(api().internalEngine().target.get()).toBeCloseTo(0);
  });

  it("honors consumer keyboard cancellation and ignores unrelated keys", () => {
    const onKeyDownCapture = vi.fn((event: React.KeyboardEvent<HTMLDivElement>) => event.preventDefault());
    const {api} = renderCarousel({onKeyDownCapture});
    fireEvent.keyDown(screen.getByRole("button", {name: "Slide 1"}), {key: "ArrowRight"});
    expect(onKeyDownCapture).toHaveBeenCalledTimes(1);
    expect(api().selectedScrollSnap()).toBe(0);
    fireEvent.keyDown(screen.getByRole("button", {name: "Slide 1"}), {key: "Escape"});
    expect(api().selectedScrollSnap()).toBe(0);
  });

  it("supports actual Button keyboard activation and click handlers without submitting forms", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const {api} = renderCarousel({}, {next: {onClick}});
    const next = screen.getByRole("button", {name: "Next slide"});
    expect(next).toHaveAttribute("type", "button");
    next.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(api().selectedScrollSnap()).toBe(1);
    fireEvent.click(screen.getByRole("button", {name: "Previous slide"}));
    expect(api().selectedScrollSnap()).toBe(0);
    expect(api().internalEngine().target.get()).toBeCloseTo(0);
  });

  it("clamps the measured ends, updates buttons and preserves explicit disabled=true", () => {
    const {api, renderAgain} = renderCarousel();
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    expect(api().selectedScrollSnap()).toBe(2);
    expect(api().internalEngine().target.get()).toBe(-640);
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    expect(api().selectedScrollSnap()).toBe(2);
    renderAgain({}, {previous: {disabled: true}});
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name: "Previous slide"}));
    expect(api().selectedScrollSnap()).toBe(2);
  });

  it("keeps both controls available and wraps requested snaps when looping", () => {
    const {api} = renderCarousel({opts: {loop: true}});
    expect(api().internalEngine().options.loop).toBe(true);
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeEnabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button", {name: "Previous slide"}));
    expect(api().selectedScrollSnap()).toBe(2);
    expect(api().internalEngine().target.get()).toBe(320);
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    expect(api().selectedScrollSnap()).toBe(0);
    expect(api().internalEngine().target.get()).toBeCloseTo(0);
  });

  it("exposes safe pending context without a viewport and enforces the provider guard", () => {
    const {unmount} = render(
      <Carousel>
        <ContextControls />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByLabelText("Carousel context")).toHaveTextContent("horizontal:pending:false:false");
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name: "Custom next"}));
    fireEvent.click(screen.getByRole("button", {name: "Custom previous"}));
    unmount();
    expect(() => render(<ContextControls />)).toThrow("useCarousel must be used within a <Carousel />");
  });

  it("initializes measured API/options/DOM refs and clears every ref on unmount", () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const trackRef = React.createRef<HTMLDivElement>();
    const slideRef = React.createRef<HTMLDivElement>();
    const previousRef = React.createRef<HTMLButtonElement>();
    const nextRef = React.createRef<HTMLButtonElement>();
    let api: CarouselApi | undefined;
    const {unmount} = render(
      <Carousel
        ref={rootRef}
        className='consumer-root'
        aria-label='Featured slides'
        opts={{align: "start", startIndex: 1}}
        setApi={(value) => {
          api = value;
        }}>
        <CarouselContent
          ref={trackRef}
          data-testid='carousel-track'
          className='consumer-track'>
          {measuredSlides(3, slideRef)}
        </CarouselContent>
        <CarouselPrevious ref={previousRef} />
        <CarouselNext
          ref={nextRef}
          size='icon-lg'
          variant='ghost'
          className='consumer-next'
          aria-label='Forward'>
          <span>Custom icon</span>
        </CarouselNext>
      </Carousel>,
    );
    if (!api) throw new Error("API callback was not invoked");
    expect(api.rootNode()).toBe(trackRef.current?.parentElement);
    expect(api.containerNode()).toBe(trackRef.current);
    expect(api.slideNodes()[0]).toBe(slideRef.current);
    expect(api.selectedScrollSnap()).toBe(1);
    expect(rootRef.current).toBe(screen.getByRole("region", {name: "Featured slides"}));
    expect(rootRef.current).toHaveClass("consumer-root");
    expect(trackRef.current).toHaveClass("consumer-track");
    expect(slideRef.current).toHaveClass("consumer-slide");
    expect(previousRef.current).toBe(screen.getByRole("button", {name: "Previous slide"}));
    const next = screen.getByRole("button", {name: "Forward"});
    expect(nextRef.current).toBe(next);
    expect(next).toHaveAttribute("data-size", "icon-lg");
    expect(next).toHaveAttribute("data-variant", "ghost");
    expect(next).toHaveClass("consumer-next");
    expect(next.querySelector("svg")).toBeNull();
    unmount();
    for (const ref of [rootRef, trackRef, slideRef, previousRef, nextRef]) expect(ref.current).toBeNull();
  });

  it("forwards plugins through real initialization, reInit and destruction while updating availability", () => {
    const lifecycle: string[] = [];
    const plugin: NonNullable<CarouselPlugin>[number] = {
      name: "fixtureLifecycle",
      options: {},
      init: (api) => {
        lifecycle.push(`init:${api.selectedScrollSnap()}`);
      },
      destroy: () => {
        lifecycle.push("destroy");
      },
    };
    const {api, unmount} = renderCarousel({plugins: [plugin]});
    expect(api().plugins()["fixtureLifecycle"]).toBe(plugin);
    expect(lifecycle).toEqual(["init:0"]);
    act(() => api().reInit({startIndex: 2}));
    expect(api().selectedScrollSnap()).toBe(2);
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeEnabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
    expect(lifecycle).toEqual(["init:0", "destroy", "init:2"]);
    unmount();
    expect(lifecycle).toEqual(["init:0", "destroy", "init:2", "destroy"]);
    const target = api().internalEngine().target.get();
    api().scrollPrev();
    expect(api().internalEngine().target.get()).toBe(target);
  });

  it("reinitializes the same engine API when orientation/options change and releases subscriptions on replacement/unmount", () => {
    const initialApi = React.createRef<CarouselApi | null>();
    let readRegistrations: (() => ReadonlyArray<Parameters<CarouselApi["on"]>>) | undefined;
    const initPlugin: NonNullable<CarouselPlugin>[number] = {
      name: "subscriptionObservation",
      options: {},
      init: (api) => {
        if (initialApi.current) return;
        initialApi.current = api;
        const on = vi.spyOn(api, "on");
        readRegistrations = () => on.mock.calls;
      },
      destroy: () => {},
    };
    const {api, renderAgain, unmount} = renderCarousel({plugins: [initPlugin]});
    if (!readRegistrations) throw new Error("Plugin did not observe API initialization");
    const registrations = [...readRegistrations()];
    expect(registrations.map(([event]) => event)).toEqual(["reInit", "select"]);
    const oldApi = api();
    const off = vi.spyOn(oldApi, "off");
    const reInit = vi.fn();
    oldApi.on("reInit", reInit);
    renderAgain({orientation: "vertical", opts: {axis: "x", startIndex: 1}, plugins: [initPlugin]});
    expect(api()).toBe(oldApi);
    expect(api().internalEngine().options.axis).toBe("y");
    expect(api().selectedScrollSnap()).toBe(1);
    expect(reInit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("button", {name: "Slide 1"}), {key: "ArrowDown"});
    expect(api().selectedScrollSnap()).toBe(2);
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
    unmount();
    for (const [event, listener] of registrations) {
      expect(off).toHaveBeenCalledWith(event, listener);
    }
    expect(off).toHaveBeenCalledWith("select", expect.any(Function));
    expect(off).toHaveBeenCalledWith("reInit", expect.any(Function));
    const notifications = reInit.mock.calls.length;
    act(() => oldApi.emit("reInit"));
    expect(reInit).toHaveBeenCalledTimes(notifications);
  });

  it("releases the old API listeners when its viewport is removed and initializes a replacement viewport", () => {
    const observedApis: CarouselApi[] = [];
    const options: CarouselOptions = {align: "start"};
    const content = (showViewport: boolean): React.ReactElement => (
      <Carousel
        opts={options}
        setApi={(api) => {
          observedApis.push(api);
        }}>
        {showViewport && <CarouselContent data-testid='carousel-track'>{measuredSlides()}</CarouselContent>}
        <CarouselPrevious />
        <CarouselNext />
        <ContextControls />
      </Carousel>
    );
    const {rerender, unmount} = render(content(true));
    const oldApi = observedApis[0];
    if (!oldApi) throw new Error("Initial viewport did not initialize");
    const off = vi.spyOn(oldApi, "off");
    const destroyed = vi.fn();
    oldApi.on("destroy", destroyed);
    rerender(content(false));
    expect(destroyed).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledWith("reInit", expect.any(Function));
    expect(off).toHaveBeenCalledWith("select", expect.any(Function));
    expect(screen.getByLabelText("Carousel context")).toHaveTextContent("horizontal:pending:false:false");
    rerender(content(true));
    const newApi = observedApis.at(-1);
    if (!newApi) throw new Error("Replacement viewport did not initialize");
    expect(newApi).not.toBe(oldApi);
    fireEvent.click(screen.getByRole("button", {name: "Custom next"}));
    expect(newApi.selectedScrollSnap()).toBe(1);
    expect(oldApi.selectedScrollSnap()).toBe(0);
    const newOff = vi.spyOn(newApi, "off");
    unmount();
    expect(newOff).toHaveBeenCalledWith("reInit", expect.any(Function));
    expect(newOff).toHaveBeenCalledWith("select", expect.any(Function));
  });

  it.each(["previous", "next"] as const)("honors primitive-handler cancellation on %s without replacing the engine", (control) => {
    const onClick: NonNullable<CarouselNext.Props["onClick"]> = (event) => event.preventBaseUIHandler();
    const {api} = renderCarousel({opts: {startIndex: 1}}, {[control]: {onClick}});
    fireEvent.click(screen.getByRole("button", {name: control === "next" ? "Next slide" : "Previous slide"}));
    expect(api().selectedScrollSnap()).toBe(1);
    expect(api().internalEngine().target.get()).toBe(-320);
  });

  it("preserves disabled and ARIA semantics on non-native rendered controls", () => {
    const onClick = vi.fn();
    const {api} = renderCarousel(
      {},
      {
        previous: {nativeButton: false, render: <a href='#previous'>Previous link</a>, onClick},
        next: {nativeButton: false, render: <a href='#next'>Next link</a>, onClick},
      },
    );
    const previous = screen.getByRole("button", {name: "Previous link"});
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).toHaveAttribute("tabindex", "-1");
    fireEvent.click(previous);
    expect(onClick).not.toHaveBeenCalled();
    expect(api().selectedScrollSnap()).toBe(0);
    fireEvent.click(screen.getByRole("button", {name: "Next link"}));
    expect(api().selectedScrollSnap()).toBe(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("leaves state-dependent consumer props to the real Button primitive", () => {
    const style: NonNullable<CarouselPrevious.Props["style"]> = (state) => ({opacity: state.disabled ? 0.5 : 1});
    const {api} = renderCarousel({}, {previous: {style}});
    expect(screen.getByRole("button", {name: "Previous slide"})).toHaveStyle({opacity: "0.5"});
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    expect(api().selectedScrollSnap()).toBe(1);
    expect(screen.getByRole("button", {name: "Previous slide"})).toHaveStyle({opacity: "1"});
  });

  it("renders the stable server snapshot with disabled navigation before viewport hydration", () => {
    const html = renderToString(
      <Carousel opts={{axis: "y"}}>
        <CarouselContent>{measuredSlides()}</CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("[data-slot='carousel']")).toHaveAttribute("data-orientation", "vertical");
    expect(container.querySelector("[data-slot='carousel-previous']")).toBeDisabled();
    expect(container.querySelector("[data-slot='carousel-next']")).toBeDisabled();
  });

  it("passes real primitive render state, child refs/content and cancellation through navigation", () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const onClick = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault());
    const {api, renderAgain} = renderCarousel(
      {},
      {
        previous: {
          ref,
          render: (props, state) => (
            <button
              {...props}
              data-disabled-state={String(state.disabled)}
            />
          ),
        },
        next: {
          render: (
            <button
              ref={childRef}
              onClick={onClick}>
              Rendered next
            </button>
          ),
        },
      },
    );
    expect(ref.current).toHaveAttribute("data-disabled-state", "true");
    const next = screen.getByRole("button", {name: "Rendered next"});
    expect(childRef.current).toBe(next);
    fireEvent.click(next);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(api().selectedScrollSnap()).toBe(0);
    renderAgain(
      {},
      {
        previous: {
          ref,
          render: (props, state) => (
            <button
              {...props}
              data-disabled-state={String(state.disabled)}
            />
          ),
        },
      },
    );
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));
    expect(ref.current).toHaveAttribute("data-disabled-state", "false");
    expect(api().selectedScrollSnap()).toBe(1);
  });

  it.each(["previous", "next"] as const)("preserves a legacy %s child target, content and ref", (control) => {
    const wrapperRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const {api} = renderCarousel(
      {opts: {startIndex: 1}},
      {
        [control]: {
          asChild: true,
          ref: wrapperRef,
          children: (
            <a
              ref={childRef}
              href='#destination'>
              Legacy navigation
            </a>
          ),
        },
      },
    );
    const target = screen.getByRole("button", {name: "Legacy navigation"});
    expect(target.tagName).toBe("A");
    expect(wrapperRef.current).toBe(target);
    expect(childRef.current).toBe(target);
    fireEvent.click(target);
    expect(api().selectedScrollSnap()).toBe(control === "next" ? 2 : 0);
  });

  it("disables both controls for a single measured slide", () => {
    render(
      <Carousel>
        <CarouselContent data-testid='carousel-track'>{measuredSlides(1)}</CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("button", {name: "Previous slide"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Next slide"})).toBeDisabled();
  });
});
