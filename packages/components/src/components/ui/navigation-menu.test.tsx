import {DirectionProvider} from "@base-ui/react/direction-provider";
import {NavigationMenu as BaseNavigationMenu} from "@base-ui/react/navigation-menu";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import * as NavigationMenuParts from "./navigation-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

interface MeasurementFixture {
  readonly resize: (element: Element) => void;
  readonly setProductsSize: (width: number, height: number) => void;
  readonly restore: () => void;
}

/** Supplies platform measurements, not a layout engine or a replacement primitive. */
function installMeasurements(): MeasurementFixture {
  let productsSize = {width: 320, height: 180};
  const observers = new Map<ResizeObserver, {callback: ResizeObserverCallback; elements: Set<Element>}>();
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

  function dimensions(element: Element): DOMRect {
    const measurement = element.getAttribute("data-measure");
    if (measurement === "products-trigger") return new DOMRect(100, 100, 100, 32);
    if (measurement === "resources-trigger") return new DOMRect(220, 150, 120, 32);
    if (measurement === "products-content") return new DOMRect(0, 0, productsSize.width, productsSize.height);
    if (measurement === "resources-content") return new DOMRect(0, 0, 480, 260);
    if (element.getAttribute("data-slot") === "navigation-menu-popup") {
      const active = element.querySelector('[data-measure$="-content"][data-open]');
      return active ? dimensions(active) : new DOMRect(0, 0, 0, 0);
    }
    if (element === document.documentElement || element === document.body) return new DOMRect(0, 0, 1024, 768);
    return new DOMRect(0, 0, 0, 0);
  }

  const rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element): DOMRect {
    return dimensions(this);
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return dimensions(this).width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return dimensions(this).height;
    },
  });

  class SuppliedResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      observers.set(this, {callback, elements: new Set<Element>()});
    }
    observe(target: Element): void {
      observers.get(this)?.elements.add(target);
    }
    unobserve(target: Element): void {
      observers.get(this)?.elements.delete(target);
    }
    disconnect(): void {
      observers.delete(this);
    }
  }
  globalThis.ResizeObserver = SuppliedResizeObserver;

  return {
    setProductsSize(width, height) {
      productsSize = {width, height};
    },
    resize(element) {
      const rect = dimensions(element);
      const size = {inlineSize: rect.width, blockSize: rect.height};
      const entry: ResizeObserverEntry = {
        target: element,
        contentRect: rect,
        contentBoxSize: [size],
        borderBoxSize: [size],
        devicePixelContentBoxSize: [size],
      };
      for (const [observer, {callback, elements}] of observers) {
        if (elements.has(element)) callback([entry], observer);
      }
    },
    restore() {
      rectSpy.mockRestore();
      globalThis.ResizeObserver = originalResizeObserver;
      if (originalOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
      if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
      observers.clear();
    },
  };
}

let measurements: MeasurementFixture | undefined;

// Characterizes an opaque slot's React normalization contract, not a genuine Flight decoder.
function opaqueSlot(element: React.ReactElement): React.ReactElement {
  const slot = {...element, $$typeof: Symbol.for("react.lazy"), _payload: element, _init: () => element};
  return slot;
}

afterEach(() => {
  cleanup();
  measurements?.restore();
  measurements = undefined;
});

function MenuItems(): React.ReactElement {
  return (
    <NavigationMenuList data-testid='navigation-list'>
      <NavigationMenuItem value='products'>
        <NavigationMenuTrigger data-measure='products-trigger'>Products</NavigationMenuTrigger>
        <NavigationMenuContent
          data-measure='products-content'
          data-testid='products-content'>
          <NavigationMenuLink href='/analytics'>Analytics</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem value='resources'>
        <NavigationMenuTrigger data-measure='resources-trigger'>Resources</NavigationMenuTrigger>
        <NavigationMenuContent
          data-measure='resources-content'
          data-testid='resources-content'>
          <NavigationMenuLink href='/guides'>Guides</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink
          href='/pricing'
          className='custom-link'>
          Pricing
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  );
}

describe("NavigationMenu", () => {
  it("refresh accessibility: authors minimum link targets and scrollable bounded viewport content", () => {
    const css = readFileSync(join(import.meta.dirname, "navigation-menu.module.css"), "utf8");
    expect(css).toMatch(/\.link\s*\{[^}]*min-height:\s*1\.5rem/u);
    expect(css).toMatch(/\.link\s*\{[^}]*min-width:\s*1\.5rem/u);
    expect(css).toMatch(/\.viewport\s*\{[^}]*overflow-y:\s*auto/u);
    expect(css).toMatch(/\.viewport\s*\{[^}]*min-height:\s*0/u);
    expect(css).toMatch(/\.popup\s*\{[^}]*display:\s*flex/u);
    expect(css).toMatch(/\.popup\s*\{[^}]*max-height:\s*var\(--available-height/u);
  });

  it.each(["ordinary", "opaque"] as const)("retains generated owners with %s element-owned children", async (kind) => {
    const slot = (element: React.ReactElement): React.ReactElement => (kind === "ordinary" ? element : opaqueSlot(element));
    render(
      <NavigationMenu
        defaultValue='products'
        render={slot(
          <nav aria-label='Composed navigation'>
            <MenuItems />
          </nav>,
        )}
        positionerProps={{
          render: slot(
            <div>
              <span>Positioner decoration</span>
            </div>,
          ),
          popupProps: {
            render: slot(
              <nav aria-label='Composed popup'>
                <span>Popup decoration</span>
              </nav>,
            ),
          },
        }}
      />,
    );
    expect(await screen.findByRole("link", {name: "Analytics"})).toBeVisible();
    expect(screen.getByRole("navigation", {name: "Composed navigation"})).toContainElement(screen.getByRole("button", {name: "Products"}));
    expect(screen.getByRole("navigation", {name: "Composed popup"})).toContainElement(screen.getByText("Popup decoration"));
    expect(screen.getAllByText("Positioner decoration")).toHaveLength(1);
    for (const owner of ["positioner", "popup", "viewport"]) {
      expect(document.querySelectorAll(`[data-slot="navigation-menu-${owner}"]`)).toHaveLength(1);
    }
  });

  it("does not resolve pending popup slots or call render callbacks while closed", async () => {
    const normalize = vi.fn(() => {
      throw new Promise<void>(() => undefined);
    });
    const pending: React.ReactElement & Readonly<{$$typeof: symbol; _payload: null; _init: () => never}> = {
      ...(<nav />),
      $$typeof: Symbol.for("react.lazy"),
      _payload: null,
      _init: normalize,
    };
    const popupRender = vi.fn((props: React.ComponentPropsWithRef<"nav">) => <nav {...props} />);
    const view = render(
      <React.Suspense fallback={<p>Suspended</p>}>
        <NavigationMenu positionerProps={{render: pending, popupProps: {render: popupRender}}}>
          <MenuItems />
        </NavigationMenu>
      </React.Suspense>,
    );
    expect(screen.getByRole("button", {name: "Products"})).toBeVisible();
    expect(screen.queryByText("Suspended")).not.toBeInTheDocument();
    expect(normalize).not.toHaveBeenCalled();
    expect(popupRender).not.toHaveBeenCalled();
    view.unmount();
  });

  it("exposes a React 19 generic function Root", () => {
    expect(typeof NavigationMenu).toBe("function");
  });

  it("merges the consumer Root callback ref with a static rendered native ref and cleans both on unmount", () => {
    const consumerNodes: (HTMLElement | null)[] = [];
    const childRef = React.createRef<HTMLElement>();
    const {unmount} = render(
      <NavigationMenu
        ref={(node) => {
          consumerNodes.push(node);
        }}
        render={
          <nav
            ref={childRef}
            aria-label='Forwarded root'
          />
        }>
        <MenuItems />
      </NavigationMenu>,
    );
    const root = screen.getByRole("navigation", {name: "Forwarded root"});
    expect(consumerNodes).toContain(root);
    expect(childRef.current).toBe(root);
    expect(root).toContainElement(screen.getByRole("button", {name: "Products"}));
    unmount();
    expect(consumerNodes.at(-1)).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("preserves inferred generic values and exact primitive Props and State contracts while forwarding Root refs", () => {
    const objectValue: {readonly id: string} = {id: "products"};
    const ref = React.createRef<HTMLElement>();
    expectTypeOf<NavigationMenu.State>().toEqualTypeOf<BaseNavigationMenu.Root.State>();
    expectTypeOf<NavigationMenu.Props<number>["onValueChange"]>().toEqualTypeOf<BaseNavigationMenu.Root.Props<number>["onValueChange"]>();
    expectTypeOf<NavigationMenu.Props<typeof objectValue>["onValueChange"]>().toEqualTypeOf<
      BaseNavigationMenu.Root.Props<typeof objectValue>["onValueChange"]
    >();
    const {rerender} = render(
      <NavigationMenu
        ref={ref}
        defaultValue={42}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
          expectTypeOf(details).toEqualTypeOf<BaseNavigationMenu.Root.ChangeEventDetails>();
        }}
        className={(state) => {
          expectTypeOf(state).toEqualTypeOf<BaseNavigationMenu.Root.State>();
          return state.open ? "inferred-open" : "inferred-closed";
        }}
        render={(props, state) => {
          expectTypeOf(state).toEqualTypeOf<BaseNavigationMenu.Root.State>();
          return (
            <nav
              {...props}
              aria-label='Inferred numeric menu'
            />
          );
        }}
      />,
    );
    expect(ref.current).toBe(screen.getByRole("navigation", {name: "Inferred numeric menu"}));
    expect(ref.current).toHaveClass("inferred-open");
    rerender(
      <NavigationMenu
        key='object-menu'
        ref={ref}
        value={objectValue}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<typeof objectValue | null>();
          expectTypeOf(details).toEqualTypeOf<BaseNavigationMenu.Root.ChangeEventDetails>();
        }}
        aria-label='Inferred object menu'
      />,
    );
    expect(ref.current).toBe(screen.getByRole("navigation", {name: "Inferred object menu"}));
  });

  it("publicly exports Positioner without compatibility Viewport or Indicator adapters", () => {
    expect(NavigationMenuParts).toHaveProperty("NavigationMenuPositioner");
    expect(NavigationMenuParts).not.toHaveProperty("NavigationMenuViewport");
    expect(NavigationMenuParts).not.toHaveProperty("NavigationMenuIndicator");
  });

  it("keeps render and class callbacks on Root, List, Trigger, Content and Link with real primitive state", async () => {
    render(
      <NavigationMenu
        data-testid='navigation-root'
        className={(state) => (state.open ? "root-open" : "root-closed")}
        render={(props, state) => (
          <nav
            {...props}
            data-nested={String(state.nested)}
          />
        )}>
        <NavigationMenuList className={(state) => (state.open ? "list-open" : "list-closed")}>
          <NavigationMenuItem value='products'>
            <NavigationMenuTrigger
              className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
              render={(props, state) => (
                <button
                  {...props}
                  data-disabled={String(state.disabled)}
                />
              )}>
              Products
            </NavigationMenuTrigger>
            <NavigationMenuContent
              className={(state) => (state.open ? "content-open" : "content-closed")}
              render={(props, state) => (
                <section
                  {...props}
                  data-direction={state.activationDirection ?? "none"}
                />
              )}>
              <NavigationMenuLink
                active
                href='/analytics'
                className={(state) => (state.active ? "link-active" : "link-inactive")}
                render={(props, state) => (
                  <a
                    {...props}
                    data-current={String(state.active)}
                  />
                )}>
                Analytics
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const trigger = screen.getByRole("button", {name: "Products"});
    expect(trigger).toHaveAttribute("data-disabled", "false");
    expect(trigger).toHaveClass("trigger-closed");
    expect(screen.getByTestId("navigation-root")).toHaveAttribute("data-nested", "false");
    fireEvent.click(trigger);
    const link = await screen.findByRole("link", {name: "Analytics"});
    expect(screen.getByTestId("navigation-root")).toHaveClass("root-open");
    expect(screen.getByRole("list")).toHaveClass("list-open");
    expect(trigger).toHaveClass("trigger-open");
    expect(link.parentElement).toHaveClass("content-open");
    expect(link.parentElement).toHaveAttribute("data-direction", "none");
    expect(link).toHaveClass("link-active");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("data-current", "true");
  });

  it("forwards Root alignment to a portaled Positioner and puts callbacks, classes and refs on their actual owners", async () => {
    const positionerRef = React.createRef<HTMLDivElement>();
    const popupRef = React.createRef<HTMLElement>();
    const viewportRef = React.createRef<HTMLDivElement>();
    const states: boolean[] = [];
    render(
      <NavigationMenu
        align='end'
        data-testid='navigation-root'
        positionerProps={{
          ref: positionerRef,
          "data-testid": "positioner",
          collisionAvoidance: {side: "none", align: "none"},
          className: (state) => (state.open ? "positioner-open" : "positioner-closed"),
          render: (props, state) => (
            <div
              {...props}
              data-placement={`${state.side}:${state.align}`}
            />
          ),
          popupProps: {
            ref: popupRef,
            "aria-label": "Product navigation",
            "data-testid": "popup",
            className: (state) => (state.open ? "popup-open" : "popup-closed"),
            render: (props, state) => {
              states.push(state.open);
              return (
                <nav
                  {...props}
                  data-phase={state.transitionStatus ?? "settled"}
                />
              );
            },
          },
          viewportProps: {ref: viewportRef, "data-testid": "viewport", className: () => "viewport-custom"},
        }}>
        <MenuItems />
      </NavigationMenu>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Products"}));
    const popup = await screen.findByRole("navigation", {name: "Product navigation"});
    const positioner = screen.getByTestId("positioner");
    expect(positionerRef.current).toBe(positioner);
    expect(popupRef.current).toBe(popup);
    expect(viewportRef.current).toBe(screen.getByTestId("viewport"));
    expect(screen.getByTestId("navigation-root")).not.toContainElement(positioner);
    expect(positioner).toContainElement(popup);
    expect(positioner).toHaveAttribute("data-placement", "bottom:end");
    expect(positioner).toHaveClass("positioner-open");
    expect(popup).toHaveClass("popup-open");
    expect(popup).not.toHaveClass("positioner-open");
    expect(screen.getByTestId("viewport")).toHaveClass("viewport-custom");
    expect(states).toContain(true);
  });

  it("emits unequal primitive sizing and activation state when items switch and supplied resize observations run", async () => {
    measurements = installMeasurements();
    const fixture = measurements;
    render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={{"data-testid": "positioner", popupProps: {"data-testid": "popup"}}}>
        <MenuItems />
      </NavigationMenu>,
    );
    const positioner = await screen.findByTestId("positioner");
    const popup = screen.getByTestId("popup");
    await waitFor(() => expect(positioner.style.getPropertyValue("--positioner-width")).toBe("320px"));
    expect(positioner.style.getPropertyValue("--positioner-height")).toBe("180px");
    act(() => fixture.resize(popup));
    fireEvent.click(screen.getByRole("button", {name: "Resources"}));
    await waitFor(() => expect(positioner.style.getPropertyValue("--positioner-width")).toBe("480px"));
    expect(positioner.style.getPropertyValue("--positioner-height")).toBe("260px");
    expect(screen.getByTestId("resources-content")).toHaveAttribute("data-activation-direction", "right");
    await waitFor(() => expect(popup.style.getPropertyValue("--popup-width")).toBe("auto"));
    act(() => fixture.resize(popup));
    fireEvent.click(screen.getByRole("button", {name: "Products"}));
    expect(screen.getByTestId("products-content")).toHaveAttribute("data-activation-direction", "left");
    fixture.setProductsSize(360, 220);
    act(() => {
      fixture.resize(popup);
      window.dispatchEvent(new Event("resize"));
    });
    expect(positioner).toHaveAttribute("data-instant");
    await waitFor(() => expect(positioner.style.getPropertyValue("--positioner-width")).toBe("360px"));
    expect(positioner.style.getPropertyValue("--positioner-height")).toBe("220px");
    await waitFor(() => expect(positioner).not.toHaveAttribute("data-instant"));
  });

  it("preserves native link attributes, active state and render-element text and refs", () => {
    const ref = React.createRef<HTMLAnchorElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink
              active
              ref={ref}
              target='_blank'
              rel='noopener noreferrer'
              download='guide.pdf'
              href='/guide.pdf'
              hrefLang='en'
              className={navigationMenuTriggerStyle("custom-link")}
              render={<a ref={childRef}>Guide</a>}
            />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const link = screen.getByRole("link", {name: "Guide"});
    expect(link).toHaveAttribute("href", "/guide.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("download", "guide.pdf");
    expect(link).toHaveAttribute("hreflang", "en");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("custom-link");
    expect(ref.current).toBe(link);
    expect(childRef.current).toBe(link);
  });

  it("routes viewport callbacks and ref through explicit Positioner viewportProps", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <NavigationMenu positionerProps={false}>
        <MenuItems />
        <NavigationMenuPositioner
          viewportProps={{
            ref,
            "data-testid": "explicit-viewport",
            className: () => "viewport-class",
            render: (props) => (
              <div
                {...props}
                data-explicit='true'
              />
            ),
          }}
        />
      </NavigationMenu>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Products"}));
    const viewport = await screen.findByTestId("explicit-viewport");
    expect(viewport).toHaveClass("viewport-class");
    expect(viewport).toHaveAttribute("data-explicit", "true");
    expect(ref.current).toBe(viewport);
    expect(viewport).toContainElement(screen.getByRole("link", {name: "Analytics"}));
    expect(document.querySelectorAll('[data-slot="navigation-menu-popup"]')).toHaveLength(1);
  });

  it("preserves native orientation and RTL keyboard navigation into content and Escape focus return", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction='rtl'>
        <NavigationMenu orientation='vertical'>
          <MenuItems />
        </NavigationMenu>
      </DirectionProvider>,
    );
    const products = screen.getByRole("button", {name: "Products"});
    act(() => products.focus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", {name: "Resources"})).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", {name: "Resources"})).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Tab}");
    await waitFor(() => expect(screen.getByRole("link", {name: "Guides"})).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", {name: "Resources"})).toHaveFocus());
    expect(screen.getByRole("button", {name: "Resources"})).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes the vertical orientation to styling without replacing native arrow behavior", async () => {
    const user = userEvent.setup();
    render(
      <NavigationMenu
        orientation='vertical'
        data-testid='vertical-root'>
        <MenuItems />
      </NavigationMenu>,
    );
    expect(screen.getByTestId("vertical-root")).toHaveAttribute("data-orientation", "vertical");
    const products = screen.getByRole("button", {name: "Products"});
    act(() => products.focus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", {name: "Resources"})).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", {name: "Resources"})).toHaveAttribute("aria-expanded", "true");
  });

  it("forwards starting and ending states without eagerly rendering callbacks or hiding controlled close details", async () => {
    const actions = React.createRef<NavigationMenu.Actions>();
    const popupPhases: (string | undefined)[] = [];
    const contentPhases: (string | undefined)[] = [];
    const reasons: NavigationMenu.ChangeEventReason[] = [];
    render(
      <NavigationMenu
        actionsRef={actions}
        onValueChange={(value, details) => {
          reasons.push(details.reason);
          if (value === null) details.preventUnmountOnClose();
        }}
        positionerProps={{
          popupProps: {
            render: (props, state) => {
              popupPhases.push(state.transitionStatus);
              return (
                <nav
                  {...props}
                  data-testid='transition-popup'
                />
              );
            },
          },
        }}>
        <NavigationMenuList>
          <NavigationMenuItem value='products'>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent
              render={(props, state) => {
                contentPhases.push(state.transitionStatus);
                return <section {...props} />;
              }}>
              <NavigationMenuLink href='/analytics'>Analytics</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Products"}));
    const popup = await screen.findByTestId("transition-popup");
    expect(popupPhases).toContain("starting");
    expect(contentPhases).toContain("starting");
    await waitFor(() => expect(popup).not.toHaveAttribute("data-starting-style"));
    fireEvent.keyDown(screen.getByRole("button", {name: "Products"}), {key: "Escape"});
    expect(reasons).toContain("escape-key");
    expect(popupPhases).toContain("ending");
    expect(contentPhases).toContain("ending");
    expect(popup).toHaveAttribute("data-ending-style");
    act(() => actions.current?.unmount());
    await waitFor(() => expect(screen.queryByTestId("transition-popup")).not.toBeInTheDocument());
  });

  it("defaults the explicit Positioner to bottom/start and receives actual initial instant state", async () => {
    const instantStates: boolean[] = [];
    render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={false}>
        <MenuItems />
        <NavigationMenuPositioner
          className={(state) => {
            instantStates.push(state.instant);
            return state.open ? "explicit-open" : "explicit-closed";
          }}
          render={(props, state) => (
            <div
              {...props}
              data-testid='explicit-positioner'
              data-placement={`${state.side}:${state.align}`}
            />
          )}
        />
      </NavigationMenu>,
    );
    const positioner = await screen.findByTestId("explicit-positioner");
    expect(positioner).toHaveAttribute("data-placement", "bottom:start");
    expect(positioner).toHaveClass("explicit-open");
    expect(instantStates).toContain(true);
    await waitFor(() => expect(instantStates).toContain(false));
  });

  it("preserves Positioner and Popup element-render children without losing or duplicating the viewport shell", async () => {
    render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={false}>
        <MenuItems />
        <NavigationMenuPositioner
          render={
            <div>
              <span>Positioner decoration</span>
            </div>
          }
          popupProps={{
            "aria-label": "Custom popup",
            render: (
              <nav>
                <h2>Popup heading</h2>
              </nav>
            ),
          }}
        />
      </NavigationMenu>,
    );
    const popup = await screen.findByRole("navigation", {name: "Custom popup"});
    expect(popup).toContainElement(screen.getByRole("heading", {name: "Popup heading"}));
    expect(popup).toContainElement(screen.getByRole("link", {name: "Analytics"}));
    expect(popup.parentElement).toContainElement(screen.getByText("Positioner decoration"));
    expect(screen.getAllByRole("heading", {name: "Popup heading"})).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="navigation-menu-positioner"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="navigation-menu-viewport"]')).toHaveLength(1);
  });

  it("preserves extra Portal children and a static rendered host without duplicating its actual menu shell", async () => {
    render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={{
          portalProps: {
            children: <span>Portal child</span>,
            render: (
              <div>
                <span>Host decoration</span>
              </div>
            ),
          },
        }}>
        <MenuItems />
      </NavigationMenu>,
    );
    await screen.findByRole("link", {name: "Analytics"});
    expect(screen.getAllByText("Portal child")).toHaveLength(1);
    expect(screen.getAllByText("Host decoration")).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="navigation-menu-positioner"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="navigation-menu-viewport"]')).toHaveLength(1);
  });

  it("forwards explicit placement and offset callbacks to the measured primitive and preserves a custom portal owner", async () => {
    measurements = installMeasurements();
    const container = document.createElement("div");
    document.body.append(container);
    const portalRef = React.createRef<HTMLDivElement>();
    const placementStates: {side: string; align: string}[] = [];
    const offsetStates: {side: string; align: string; anchor: {width: number; height: number}}[] = [];
    const {unmount} = render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={false}>
        <MenuItems />
        <NavigationMenuPositioner
          side='top'
          align='center'
          positionMethod='fixed'
          sideOffset={(state) => {
            offsetStates.push(state);
            return 12;
          }}
          alignOffset={(state) => {
            offsetStates.push(state);
            return 4;
          }}
          collisionAvoidance={{side: "none", align: "none"}}
          portalProps={{
            container,
            ref: portalRef,
            className: () => "portal-custom",
            render: (props, state) => (
              <div
                {...props}
                data-testid='portal-owner'
                data-state-keys={Object.keys(state).join(",")}
              />
            ),
          }}
          render={(props, state) => {
            placementStates.push(state);
            return (
              <div
                {...props}
                data-testid='custom-positioner'
              />
            );
          }}
          popupProps={{"aria-label": "Measured navigation"}}
        />
      </NavigationMenu>,
    );
    try {
      const popup = await screen.findByRole("navigation", {name: "Measured navigation"});
      expect(container).toContainElement(popup);
      expect(portalRef.current).toBe(screen.getByTestId("portal-owner"));
      expect(portalRef.current).toHaveClass("portal-custom");
      expect(portalRef.current).toHaveAttribute("data-state-keys", "");
      expect(screen.getByTestId("custom-positioner")).not.toHaveClass("portal-custom");
      await waitFor(() => expect(placementStates).toContainEqual(expect.objectContaining({side: "top", align: "center"})));
      await waitFor(() =>
        expect(offsetStates).toContainEqual(
          expect.objectContaining({
            side: "top",
            align: "center",
            anchor: {width: 100, height: 32},
          }),
        ),
      );
    } finally {
      unmount();
      container.remove();
    }
  });

  it("preserves element-render child content, event merging and refs on Root, List, Item, Trigger and Content", async () => {
    const rootRef = React.createRef<HTMLElement>();
    const listRef = React.createRef<HTMLUListElement>();
    const itemRef = React.createRef<HTMLLIElement>();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const contentRef = React.createRef<HTMLDivElement>();
    const childClick = vi.fn();
    const triggerClick = vi.fn();
    const {unmount} = render(
      <NavigationMenu
        ref={rootRef}
        render={
          <nav aria-label='Rendered menu'>
            <NavigationMenuList
              ref={listRef}
              render={
                <ul>
                  <NavigationMenuItem
                    value='products'
                    ref={itemRef}
                    className={() => "item-custom"}
                    render={
                      <li>
                        <NavigationMenuTrigger
                          ref={triggerRef}
                          onClick={triggerClick}
                          render={
                            <button
                              ref={childRef}
                              onClick={childClick}>
                              Products
                            </button>
                          }
                        />
                        <NavigationMenuContent
                          ref={contentRef}
                          render={
                            <div>
                              <NavigationMenuLink href='/analytics'>Analytics</NavigationMenuLink>
                            </div>
                          }
                        />
                      </li>
                    }
                  />
                </ul>
              }
            />
          </nav>
        }
      />,
    );
    const trigger = screen.getByRole("button", {name: "Products"});
    expect(rootRef.current).toBe(screen.getByRole("navigation", {name: "Rendered menu"}));
    expect(listRef.current).toBe(screen.getByRole("list"));
    expect(itemRef.current).toHaveClass("item-custom");
    expect(triggerRef.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toHaveAttribute("data-popup-open");
    fireEvent.click(trigger);
    expect(childClick).toHaveBeenCalledOnce();
    expect(triggerClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("data-popup-open");
    expect(trigger.querySelector('[aria-hidden="true"]')).toHaveAttribute("data-popup-open");
    const link = await screen.findByRole("link", {name: "Analytics"});
    expect(contentRef.current).toContainElement(link);
    unmount();
    expect(rootRef.current).toBeNull();
    expect(listRef.current).toBeNull();
    expect(itemRef.current).toBeNull();
    expect(triggerRef.current).toBeNull();
    expect(childRef.current).toBeNull();
    expect(contentRef.current).toBeNull();
  });

  it("retains native button type and disabled semantics and lets a composed consumer cancel primitive activation", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger disabled>Disabled</NavigationMenuTrigger>
              <NavigationMenuContent>Disabled content</NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger
                onClick={(event) => event.preventBaseUIHandler()}
                render={<button>Cancelled</button>}
              />
              <NavigationMenuContent>Cancelled content</NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </form>,
    );
    const disabled = screen.getByRole("button", {name: "Disabled"});
    const cancelled = screen.getByRole("button", {name: "Cancelled"});
    expect(disabled).toHaveAttribute("type", "button");
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    await user.click(disabled);
    fireEvent.click(cancelled);
    expect(disabled).toHaveAttribute("aria-expanded", "false");
    expect(cancelled).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Disabled content")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled content")).not.toBeInTheDocument();
  });

  it("keeps generic value-change details and cancellation owned by Root", () => {
    const changes: {value: number | null; reason: NavigationMenu.ChangeEventReason}[] = [];
    render(
      <NavigationMenu<number>
        onValueChange={(value, details) => {
          changes.push({value, reason: details.reason});
          details.cancel();
        }}>
        <NavigationMenuList>
          <NavigationMenuItem value={42}>
            <NavigationMenuTrigger>Numeric item</NavigationMenuTrigger>
            <NavigationMenuContent>Numeric content</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const trigger = screen.getByRole("button", {name: "Numeric item"});
    fireEvent.click(trigger);
    expect(changes).toContainEqual({value: 42, reason: "trigger-press"});
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Numeric content")).not.toBeInTheDocument();
  });

  it("preserves controlled open/close values and forwards link-press closing details with native cancellation", async () => {
    const changes: {value: string | null; reason: NavigationMenu.ChangeEventReason}[] = [];
    const childClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    const wrapperClick = vi.fn();
    const menu = (value: string | null): React.ReactElement => (
      <NavigationMenu
        value={value}
        onValueChange={(nextValue, details) => changes.push({value: nextValue, reason: details.reason})}>
        <NavigationMenuList>
          <NavigationMenuItem value='products'>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink
                closeOnClick
                href='#analytics'
                onClick={wrapperClick}
                render={<a onClick={childClick}>Analytics</a>}
              />
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
    const {rerender} = render(menu("products"));
    const link = await screen.findByRole("link", {name: "Analytics"});
    expect(fireEvent.click(link)).toBe(false);
    expect(childClick).toHaveBeenCalledOnce();
    expect(wrapperClick).toHaveBeenCalledOnce();
    expect(changes).toContainEqual({value: null, reason: "link-press"});
    expect(screen.getByRole("button", {name: "Products"})).toHaveAttribute("aria-expanded", "true");
    rerender(menu(null));
    await waitFor(() => expect(screen.queryByRole("link", {name: "Analytics"})).not.toBeInTheDocument());
    expect(screen.getByRole("button", {name: "Products"})).toHaveAttribute("aria-expanded", "false");
    rerender(menu("products"));
    expect(await screen.findByRole("link", {name: "Analytics"})).toBeInTheDocument();
  });

  it("uses RTL horizontal arrows without replacing the primitive's tab order", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider direction='rtl'>
        <NavigationMenu>
          <MenuItems />
        </NavigationMenu>
      </DirectionProvider>,
    );
    act(() => screen.getByRole("button", {name: "Products"}).focus());
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", {name: "Resources"})).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", {name: "Products"})).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", {name: "Products"})).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Tab}");
    await waitFor(() => expect(screen.getByRole("link", {name: "Analytics"})).toHaveFocus());
  });

  it("preserves vertical activation direction from supplied trigger DOMRects", async () => {
    measurements = installMeasurements();
    render(
      <NavigationMenu
        orientation='vertical'
        defaultValue='products'>
        <MenuItems />
      </NavigationMenu>,
    );
    await screen.findByRole("link", {name: "Analytics"});
    fireEvent.click(screen.getByRole("button", {name: "Resources"}));
    expect(screen.getByTestId("resources-content")).toHaveAttribute("data-activation-direction", "down");
    fireEvent.click(screen.getByRole("button", {name: "Products"}));
    expect(screen.getByTestId("products-content")).toHaveAttribute("data-activation-direction", "up");
  });

  it("uses supplied ResizeObserver dimensions as the animation baseline for a real content mutation", async () => {
    measurements = installMeasurements();
    const fixture = measurements;
    const {unmount} = render(
      <NavigationMenu
        defaultValue='products'
        positionerProps={{
          "data-testid": "resize-positioner",
          popupProps: {"data-testid": "resize-popup"},
        }}>
        <MenuItems />
      </NavigationMenu>,
    );
    const popup = await screen.findByTestId("resize-popup");
    const positioner = screen.getByTestId("resize-positioner");
    await waitFor(() => expect(popup.style.getPropertyValue("--popup-width")).toBe("auto"));
    fixture.setProductsSize(360, 220);
    act(() => fixture.resize(popup));

    // Hold the platform frame boundary so the emitted pre-animation size is observable.
    const frameSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1000000);
    try {
      fixture.setProductsSize(420, 280);
      const extra = document.createElement("span");
      extra.textContent = "Additional content";
      act(() => screen.getByTestId("products-content").append(extra));
      await waitFor(() => expect(positioner.style.getPropertyValue("--positioner-width")).toBe("420px"));
      expect(positioner.style.getPropertyValue("--positioner-height")).toBe("280px");
      expect(popup.style.getPropertyValue("--popup-width")).toBe("360px");
      expect(popup.style.getPropertyValue("--popup-height")).toBe("220px");
    } finally {
      unmount();
      frameSpy.mockRestore();
    }
  });
});
