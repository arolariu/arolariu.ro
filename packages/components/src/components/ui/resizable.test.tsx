import {act, fireEvent, render, screen, within} from "@testing-library/react";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import postcss from "postcss";
import {createRef} from "react";
import type {GroupProps, PanelProps, SeparatorProps} from "react-resizable-panels";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type GroupImperativeHandle,
  type PanelImperativeHandle,
  type ResizableHandleProps,
  type ResizablePanelGroupProps,
  type ResizablePanelProps,
} from "./resizable";
import styles from "./resizable.module.css";

interface ResizableFixtureProps {
  readonly group?: ResizablePanelGroupProps;
  readonly panel?: ResizablePanelProps;
  readonly handle?: ResizableHandleProps;
  readonly secondPanel?: ResizablePanelProps;
}

function panelPercentage(element: HTMLElement): number {
  const percentage = Number.parseFloat(element.style.flexGrow || element.style.flexBasis);
  return Number.isFinite(percentage) ? percentage : 50;
}

function renderResizable({group, panel, handle, secondPanel}: Readonly<ResizableFixtureProps> = {}): ReturnType<typeof render> {
  return render(
    <ResizablePanelGroup
      id='group'
      {...group}>
      <ResizablePanel
        id='first'
        defaultSize='50%'
        {...panel}>
        First panel
      </ResizablePanel>
      <ResizableHandle
        id='separator'
        aria-label='Resize panels'
        {...handle}
      />
      <ResizablePanel
        id='second'
        defaultSize='50%'
        {...secondPanel}>
        Second panel
      </ResizablePanel>
    </ResizablePanelGroup>,
  );
}

// Supply available panel geometry only; Happy DOM does not perform flex layout.
let fixtureWidth = 1000;
// Opt-in browser-like flow: 1px separators occupy space and the 0×0 step-control container sits right after its
// separator (where the primitive's hit-region scan sees it). The default fixture overlaps each separator with the next
// panel and leaves non-panel children unpositioned.
let flowLayout = false;
function fixtureRect(element: HTMLElement): DOMRect {
  const width = fixtureWidth;
  const height = 600;
  if (element.hasAttribute("data-group")) return new DOMRect(0, 0, width, height);
  const group = element.parentElement?.closest<HTMLElement>("[data-group]");
  const controls = flowLayout && element.classList.contains(styles.resizeControls ?? "resizeControls");
  if (!group || (!element.hasAttribute("data-panel") && !element.hasAttribute("data-separator") && !controls)) return new DOMRect();

  const vertical = group.style.flexDirection === "column";
  let precedingPercentage = 0;
  let precedingSeparators = 0;
  for (const sibling of group.children) {
    if (sibling === element) break;
    if (sibling instanceof HTMLElement && sibling.hasAttribute("data-panel")) {
      precedingPercentage += panelPercentage(sibling);
    }
    if (flowLayout && sibling.hasAttribute("data-separator")) precedingSeparators++;
  }
  const offset = (precedingPercentage / 100) * (vertical ? height : width) + precedingSeparators;
  if (controls) return vertical ? new DOMRect(width / 2, offset, 0, 0) : new DOMRect(offset, height / 2, 0, 0);
  const percentage = panelPercentage(element);
  const separator = element.hasAttribute("data-separator");
  return new DOMRect(
    vertical ? 0 : offset,
    vertical ? offset : 0,
    vertical ? width : separator ? 1 : (percentage / 100) * width,
    vertical ? (separator ? 1 : (percentage / 100) * height) : height,
  );
}

/** Resolves a declared length; Happy DOM cascades the stylesheet but performs no layout. */
function declaredPixels(value: string): number | undefined {
  const text = value.trim();
  if (text === "" || text === "auto") return undefined;
  const match = /^(-?\d*\.?\d+)(px|rem)?$/u.exec(text);
  if (!match) throw new Error(`Unsupported CSS length "${value}"`);
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

/** Lays out an absolutely positioned step control against its 0×0 container (LTR, horizontal-tb), as a browser would. */
function controlRect(control: HTMLElement): DOMRect {
  const container = control.parentElement;
  if (!container) throw new Error("Missing step-control container");
  const containerStyle = getComputedStyle(container);
  expect(containerStyle.position).toBe("relative");
  expect(declaredPixels(containerStyle.width)).toBe(0);
  expect(declaredPixels(containerStyle.height)).toBe(0);
  const origin = fixtureRect(container);
  const style = getComputedStyle(control);
  expect(style.position).toBe("absolute");
  const width = declaredPixels(style.width);
  const height = declaredPixels(style.height);
  const start = declaredPixels(style.getPropertyValue("inset-inline-start"));
  const end = declaredPixels(style.getPropertyValue("inset-inline-end"));
  const top = declaredPixels(style.getPropertyValue("inset-block-start"));
  const bottom = declaredPixels(style.getPropertyValue("inset-block-end"));
  if (width === undefined || height === undefined) throw new Error("Step controls need a declared size");
  const x = start === undefined ? (end === undefined ? Number.NaN : origin.x - end - width) : origin.x + start;
  const y = top === undefined ? (bottom === undefined ? Number.NaN : origin.y - bottom - height) : origin.y + top;
  if (Number.isNaN(x) || Number.isNaN(y)) throw new Error("Step controls need a declared inline and block inset");
  return new DOMRect(x, y, width, height);
}

/** The control pixel nearest the separator line: the press most likely to land in the primitive's widened hit area. */
function pressNearestSeparator(control: DOMRect, line: DOMRect, vertical: boolean): {clientX: number; clientY: number} {
  const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
  return vertical
    ? {clientX: control.x + control.width / 2, clientY: clamp(line.y + line.height / 2, control.top + 0.5, control.bottom - 0.5)}
    : {clientX: clamp(line.x + line.width / 2, control.left + 0.5, control.right - 0.5), clientY: control.y + control.height / 2};
}

const observers = new Map<ResizeObserver, {callback: ResizeObserverCallback; elements: Set<Element>}>();

class FixtureResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    observers.set(this, {callback, elements: new Set()});
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

function notifyResize(): void {
  act(() => {
    for (const [observer, {callback, elements}] of observers) {
      callback(
        Array.from(elements, (target): ResizeObserverEntry => {
          const contentRect = target.getBoundingClientRect();
          const size = {blockSize: contentRect.height, inlineSize: contentRect.width};
          return {target, contentRect, borderBoxSize: [size], contentBoxSize: [size], devicePixelContentBoxSize: [size]};
        }),
        observer,
      );
    }
  });
}

function matchedDeclarations(element: Element, rules: CSSRuleList, pseudo = ""): CSSStyleDeclaration {
  const declaration = document.createElement("div").style;
  for (const rule of rules) {
    if (!(rule instanceof CSSStyleRule)) continue;
    for (const selector of rule.selectorText.split(",")) {
      const trimmed = selector.trim();
      if (pseudo ? !trimmed.endsWith(pseudo) : trimmed.includes("::")) continue;
      const targetSelector = pseudo ? trimmed.slice(0, -pseudo.length) : trimmed;
      if (!element.matches(targetSelector)) continue;
      for (let index = 0; index < rule.style.length; index++) {
        const property = rule.style.item(index);
        declaration.setProperty(property, rule.style.getPropertyValue(property));
      }
    }
  }
  return declaration;
}

// Happy DOM drops system-color declarations; parse conditional rules and match their actual DOM selectors instead.
function matchedMediaDeclarations(element: Element, stylesheet: HTMLStyleElement, condition: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  postcss.parse(stylesheet.textContent ?? "").walkAtRules("media", (media) => {
    if (media.params !== condition) return;
    media.walkRules((rule) => {
      if (!rule.selectors.some((selector) => element.matches(selector))) return;
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value;
      });
    });
  });
  return declarations;
}

describe("Resizable v4 contracts", () => {
  it.each(["first", "second"] as const)(
    "crosses %s panel collapse and expansion boundaries when the minimum exceeds the click step",
    (side) => {
      const groupRef = createRef<GroupImperativeHandle>();
      const panelRef = createRef<PanelImperativeHandle>();
      const constraints = {panelRef, collapsible: true, minSize: "30%", collapsedSize: "0%"};
      renderResizable({
        group: {groupRef},
        ...(side === "first" ? {panel: constraints} : {secondPanel: constraints}),
        handle: {resizeStep: 10},
      });
      notifyResize();
      const shrink = screen.getByRole("button", {name: side === "first" ? "Decrease previous panel" : "Increase previous panel"});
      const grow = screen.getByRole("button", {name: side === "first" ? "Increase previous panel" : "Decrease previous panel"});
      fireEvent.click(shrink);
      expect(groupRef.current?.getLayout()[side]).toBe(40);
      fireEvent.click(shrink);
      expect(groupRef.current?.getLayout()[side]).toBe(30);
      fireEvent.click(shrink);
      expect(groupRef.current?.getLayout()[side]).toBe(0);
      expect(panelRef.current?.isCollapsed()).toBe(true);
      fireEvent.click(grow);
      expect(groupRef.current?.getLayout()[side]).toBe(30);
      expect(panelRef.current?.isCollapsed()).toBe(false);
    },
  );

  it.each([
    {side: "first", name: "Increase previous panel"},
    {side: "first", name: "Decrease previous panel"},
    {side: "second", name: "Increase previous panel"},
    {side: "second", name: "Decrease previous panel"},
  ] as const)("does not resize a locked $side panel with $name", ({side, name}) => {
    const groupRef = createRef<GroupImperativeHandle>();
    renderResizable({
      group: {groupRef},
      ...(side === "first" ? {panel: {disabled: true}} : {secondPanel: {disabled: true}}),
    });
    notifyResize();
    const control = screen.getByRole("button", {name});
    fireEvent.click(control);
    expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
    expect(control).toBeDisabled();
  });

  it.each(["300px", 300, "30"] as const)(
    "crosses native collapse constraints expressed as %s without treating numeric pixels as percentages",
    (minSize) => {
      const panelRef = createRef<PanelImperativeHandle>();
      renderResizable({panel: {panelRef, collapsible: true, minSize}, handle: {resizeStep: 10}});
      notifyResize();
      for (let index = 0; index < 3; index++) fireEvent.click(screen.getByRole("button", {name: "Decrease previous panel"}));
      expect(panelRef.current?.isCollapsed()).toBe(true);
      fireEvent.click(screen.getByRole("button", {name: "Increase previous panel"}));
      expect(panelRef.current?.getSize().asPercentage).toBe(30);
    },
  );

  it("does not let an adjacent-pair operation redistribute a distant locked panel", () => {
    const groupRef = createRef<GroupImperativeHandle>();
    render(
      <ResizablePanelGroup
        id='group'
        groupRef={groupRef}>
        <ResizablePanel
          id='first'
          defaultSize='30%'
          disabled>
          Locked
        </ResizablePanel>
        <ResizablePanel
          id='second'
          defaultSize='35%'>
          Editable
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id='third'
          defaultSize='35%'
          maxSize='40%'>
          Limited
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    notifyResize();
    const decrease = screen.getByRole("button", {name: "Decrease previous panel"});
    fireEvent.click(decrease);
    expect(groupRef.current?.getLayout()).toEqual({first: 30, second: 30, third: 40});
    expect(decrease).toBeDisabled();
    fireEvent.click(decrease);
    expect(groupRef.current?.getLayout()).toEqual({first: 30, second: 30, third: 40});
    fireEvent.click(screen.getByRole("button", {name: "Increase previous panel"}));
    expect(groupRef.current?.getLayout()).toEqual({first: 30, second: 40, third: 30});
  });

  it("disables only the impossible direction at the actual adjacent constraints", () => {
    renderResizable({panel: {minSize: "40%", maxSize: "60%"}});
    notifyResize();
    const increase = screen.getByRole("button", {name: "Increase previous panel"});
    const decrease = screen.getByRole("button", {name: "Decrease previous panel"});
    fireEvent.click(increase);
    expect(increase).toBeDisabled();
    expect(decrease).toBeEnabled();
    fireEvent.click(decrease);
    fireEvent.click(decrease);
    expect(decrease).toBeDisabled();
    expect(increase).toBeEnabled();
  });

  it("refreshes pixel-based click limits when available native geometry changes without a percentage-layout change", () => {
    renderResizable({panel: {maxSize: 600}});
    notifyResize();
    const increase = screen.getByRole("button", {name: "Increase previous panel"});
    fireEvent.click(increase);
    expect(increase).toBeDisabled();
    fixtureWidth = 500;
    notifyResize();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "60");
    expect(increase).toBeEnabled();
    fireEvent.click(increase);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "70");
  });

  it("disables click alternatives with the group and accepts localized names", () => {
    renderResizable({
      group: {disabled: true},
      handle: {decreaseLabel: "Réduire", increaseLabel: "Agrandir"},
    });
    notifyResize();
    expect(screen.getByRole("button", {name: "Réduire"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Agrandir"})).toBeDisabled();
  });

  it.each([0, -1, 101, Number.NaN])("rejects an invalid single-click resize step %s", (resizeStep) => {
    expect(() => renderResizable({handle: {resizeStep}})).toThrow(/resizeStep/u);
  });

  it("offers native single-click resizing without requiring a dragging gesture", () => {
    renderResizable();
    notifyResize();
    const separator = screen.getByRole("separator");
    const before = Number(separator.getAttribute("aria-valuenow"));
    fireEvent.click(screen.getByRole("button", {name: "Increase previous panel"}));
    expect(Number(separator.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    fireEvent.click(screen.getByRole("button", {name: "Decrease previous panel"}));
    expect(Number(separator.getAttribute("aria-valuenow"))).toBeCloseTo(before);
  });

  let stylesheet: HTMLStyleElement;
  let ariaDisabledDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    fixtureWidth = 1000;
    flowLayout = false;
    // v4 reads ARIAMixin reflection; Happy DOM lacks ariaDisabled on Element.
    ariaDisabledDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "ariaDisabled");
    Object.defineProperty(Element.prototype, "ariaDisabled", {
      configurable: true,
      get(this: Element): string | null {
        return this.getAttribute("aria-disabled");
      },
    });
    vi.stubGlobal("ResizeObserver", FixtureResizeObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return fixtureRect(this);
    });
    for (const [property, dimension] of [
      ["offsetWidth", "width"],
      ["offsetHeight", "height"],
      ["offsetLeft", "x"],
      ["offsetTop", "y"],
    ] as const) {
      vi.spyOn(HTMLElement.prototype, property, "get").mockImplementation(function (this: HTMLElement) {
        return fixtureRect(this)[dimension];
      });
    }

    // Apply the actual stylesheet against the CSS Module class names emitted by Vitest.
    stylesheet = document.createElement("style");
    stylesheet.textContent =
      ":root { --ac-border: #999; --ac-ring: #00f; --ac-background: #fff; }"
      + readFileSync(resolve(import.meta.dirname, "resizable.module.css"), "utf8").replace(
        /\.([a-zA-Z][\w-]*)/g,
        (_match, name: string) => `.${styles[name] ?? name}`,
      );
    document.head.append(stylesheet);
  });

  afterEach(() => {
    stylesheet.remove();
    vi.unstubAllGlobals();
    observers.clear();
    if (ariaDisabledDescriptor) Object.defineProperty(Element.prototype, "ariaDisabled", ariaDisabledDescriptor);
    else Reflect.deleteProperty(Element.prototype, "ariaDisabled");
  });

  it.each([
    {orientation: "horizontal", separatorOrientation: "vertical", direction: "row", width: "1px", height: "", rotation: ""},
    {
      orientation: "vertical",
      separatorOrientation: "horizontal",
      direction: "column",
      width: "100%",
      height: "1px",
      rotation: "rotate(90deg)",
    },
  ] as const)("matches actual $orientation state with the perpendicular separator stylesheet", (fixture) => {
    renderResizable({
      group: {orientation: fixture.orientation, className: "custom-group"},
      handle: {withHandle: true, className: "custom-handle"},
    });

    const group = screen.getByTestId("group");
    const separator = screen.getByRole("separator", {name: "Resize panels"});
    const grip = separator.querySelector("div");
    const groupClass = styles.group;
    const handleClass = styles.handle;
    if (!groupClass || !handleClass) throw new Error("Missing CSS Module classes");
    expect(group).toHaveClass(groupClass, "custom-group");
    expect(group).toHaveStyle({display: "flex", flexDirection: fixture.direction});
    expect(separator).toHaveAttribute("aria-orientation", fixture.separatorOrientation);
    expect(separator).not.toHaveAttribute("data-panel-group-direction");
    expect(separator).toHaveClass(handleClass, "custom-handle");
    expect(window.getComputedStyle(separator).width).toBe(fixture.width);
    expect(window.getComputedStyle(separator).height).toBe(fixture.height);
    expect(grip).not.toBeNull();
    if (!grip) throw new Error("Missing visual grip");
    expect(window.getComputedStyle(grip).transform).toBe(fixture.rotation);

    const sheet = stylesheet.sheet;
    if (!sheet) throw new Error("Missing test stylesheet");
    const hitArea = matchedDeclarations(separator, sheet.cssRules, "::after");
    expect(hitArea.width).toBe(fixture.orientation === "vertical" ? "100%" : "1.5rem");
    expect(hitArea.height).toBe(fixture.orientation === "vertical" ? "1.5rem" : "");
    expect(hitArea.left).toBe(fixture.orientation === "vertical" ? "0px" : "50%");
    expect(hitArea.transform).toBe(fixture.orientation === "vertical" ? "translateY(-50%)" : "translateX(-50%)");
  });

  it.each([undefined, false, true])("preserves custom children with withHandle=%s", (withHandle) => {
    renderResizable({handle: {withHandle, children: <span>Custom handle content</span>}});

    const separator = screen.getByRole("separator");
    expect(screen.getByText("First panel")).toBeInTheDocument();
    expect(screen.getByText("Second panel")).toBeInTheDocument();
    expect(separator).toHaveTextContent("Custom handle content");
    expect(separator.querySelector("svg") !== null).toBe(withHandle === true);
    if (withHandle) expect(separator.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    {orientation: "horizontal", forward: "ArrowRight", backward: "ArrowLeft", unrelated: "ArrowDown"},
    {orientation: "vertical", forward: "ArrowDown", backward: "ArrowUp", unrelated: "ArrowRight"},
  ] as const)("forwards $orientation keyboard resizing, limits and layout metadata", ({orientation, forward, backward, unrelated}) => {
    const groupRef = createRef<GroupImperativeHandle>();
    const onLayoutChanged = vi.fn<NonNullable<ResizablePanelGroupProps["onLayoutChanged"]>>();
    renderResizable({group: {orientation, groupRef, onLayoutChanged}, panel: {minSize: "20%", maxSize: "60%"}});
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-controls", "first");
    expect(separator).toHaveAttribute("aria-valuemin", "20");
    expect(separator).toHaveAttribute("aria-valuemax", "60");
    expect(separator).toHaveAttribute("aria-valuenow", "50");
    onLayoutChanged.mockClear();

    fireEvent.keyDown(separator, {key: unrelated});
    expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
    expect(onLayoutChanged).not.toHaveBeenCalled();
    fireEvent.keyDown(separator, {key: forward});
    expect(separator).toHaveAttribute("aria-valuenow", "55");
    expect(groupRef.current?.getLayout()).toEqual({first: 55, second: 45});
    expect(onLayoutChanged).toHaveBeenLastCalledWith(
      {first: 55, second: 45},
      {isUserInteraction: true, requestedLayout: {first: 55, second: 45}},
    );
    fireEvent.keyDown(separator, {key: backward});
    expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
    fireEvent.keyDown(separator, {key: "End"});
    expect(groupRef.current?.getLayout()).toEqual({first: 60, second: 40});
    fireEvent.keyDown(separator, {key: "Home"});
    expect(groupRef.current?.getLayout()).toEqual({first: 20, second: 80});
  });

  it.each([
    {orientation: "horizontal", moveX: 100, moveY: 0},
    {orientation: "vertical", moveX: 0, moveY: 60},
  ] as const)("forwards $orientation drag updates and commits only after pointer release", ({orientation, moveX, moveY}) => {
    // Browser-like flow puts the step-control container between the separator and the next panel, where
    // react-resizable-panels' hit-region scan would otherwise add a separator-less region that claims this press.
    flowLayout = true;
    const groupRef = createRef<GroupImperativeHandle>();
    const onLayoutChange = vi.fn<NonNullable<ResizablePanelGroupProps["onLayoutChange"]>>();
    const onLayoutChanged = vi.fn<NonNullable<ResizablePanelGroupProps["onLayoutChanged"]>>();
    const onPointerDown = vi.fn<NonNullable<ResizableHandleProps["onPointerDown"]>>();
    renderResizable({
      group: {orientation, groupRef, onLayoutChange, onLayoutChanged},
      panel: {minSize: "20%", maxSize: "60%"},
      handle: {withHandle: true, onPointerDown},
    });
    const separator = screen.getByRole("separator");
    expect(screen.getAllByRole("button")).toHaveLength(2);
    const line = separator.getBoundingClientRect();
    const centre = {clientX: line.x + line.width / 2, clientY: line.y + line.height / 2};
    const clientX = centre.clientX + moveX;
    const clientY = centre.clientY + moveY;
    const pointer = {pointerId: 1, pointerType: "mouse", button: 0, buttons: 1};
    onLayoutChange.mockClear();
    onLayoutChanged.mockClear();
    fireEvent.pointerDown(separator, {...pointer, ...centre});
    expect(separator).toHaveAttribute("data-separator", "active");
    expect(separator).toHaveFocus();
    expect(onPointerDown).toHaveBeenCalledOnce();

    fireEvent.pointerMove(separator, {...pointer, clientX, clientY});
    expect(separator.hasPointerCapture(1)).toBe(true);
    expect(groupRef.current?.getLayout()).toEqual({first: 60, second: 40});
    expect(separator).toHaveAttribute("aria-valuenow", "60");
    expect(onLayoutChange).toHaveBeenLastCalledWith({first: 60, second: 40});
    expect(onLayoutChanged).not.toHaveBeenCalled();

    fireEvent.pointerUp(separator, {...pointer, buttons: 0, clientX, clientY});
    // Browsers implicitly release capture after pointerup; Happy DOM requires that platform delivery explicitly.
    separator.releasePointerCapture(1);
    fireEvent.lostPointerCapture(separator, {pointerId: 1, pointerType: "mouse"});
    expect(separator).toHaveAttribute("data-separator", "inactive");
    expect(separator).not.toHaveFocus();
    expect(onLayoutChanged).toHaveBeenLastCalledWith(
      {first: 60, second: 40},
      {isUserInteraction: true, requestedLayout: {first: 60, second: 40}},
    );
  });

  it.each(["horizontal", "vertical"] as const)(
    "restores the default sizes on a %s separator double-click while step controls are rendered",
    (orientation) => {
      flowLayout = true;
      const groupRef = createRef<GroupImperativeHandle>();
      renderResizable({group: {orientation, groupRef}});
      notifyResize();
      fireEvent.click(screen.getByRole("button", {name: "Increase previous panel"}));
      expect(groupRef.current?.getLayout()).toEqual({first: 60, second: 40});
      const line = screen.getByRole("separator").getBoundingClientRect();
      fireEvent.doubleClick(screen.getByRole("separator"), {clientX: line.x + line.width / 2, clientY: line.y + line.height / 2});
      expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
    },
  );

  it.each(
    (["horizontal", "vertical"] as const).flatMap((orientation) =>
      (
        [
          {control: "Decrease previous panel", first: 40, away: -20},
          {control: "Increase previous panel", first: 60, away: 20},
        ] as const
      ).flatMap(({control, first, away}) =>
        (
          [
            {hitArea: "default 10px fine hit area", resizeTargetMinimumSize: undefined},
            {hitArea: "20px coarse-sized hit area", resizeTargetMinimumSize: {fine: 20, coarse: 20}},
          ] as const
        ).map(({hitArea, resizeTargetMinimumSize}) => ({orientation, control, first, away, hitArea, resizeTargetMinimumSize})),
      ),
    ),
  )(
    "steps without dragging when a $orientation '$control' press lands nearest the separator ($hitArea)",
    ({orientation, control, first, away, resizeTargetMinimumSize}) => {
      flowLayout = true;
      const groupRef = createRef<GroupImperativeHandle>();
      const onLayoutChange = vi.fn<NonNullable<ResizablePanelGroupProps["onLayoutChange"]>>();
      renderResizable({group: {orientation, groupRef, onLayoutChange, resizeTargetMinimumSize}});
      notifyResize();
      const separator = screen.getByRole("separator");
      const button = screen.getByRole("button", {name: control});
      const vertical = orientation === "vertical";
      const line = separator.getBoundingClientRect();
      const bounds = controlRect(button);
      const press = pressNearestSeparator(bounds, line, vertical);
      // Moving 20px away from the line stays inside the 24px control, as a jittery press would.
      const release = vertical ? {...press, clientY: press.clientY + away} : {...press, clientX: press.clientX + away};
      const pointer = {pointerId: 3, pointerType: "mouse", button: 0, buttons: 1};
      onLayoutChange.mockClear();

      fireEvent.pointerDown(button, {...pointer, ...press});
      expect(separator).not.toHaveFocus();
      fireEvent.pointerMove(button, {...pointer, ...release});
      expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
      expect(onLayoutChange).not.toHaveBeenCalled();
      fireEvent.pointerUp(button, {...pointer, buttons: 0, ...release});
      fireEvent.click(button, release);

      expect(groupRef.current?.getLayout()).toEqual({first, second: 100 - first});
      expect(separator).not.toHaveAttribute("data-separator", "active");
      // The geometry behind the result: at least 10px between the control and the 1px line on its side.
      const clearance = vertical
        ? Math.max(line.top - bounds.bottom, bounds.top - line.bottom)
        : Math.max(line.left - bounds.right, bounds.left - line.right);
      expect(clearance).toBeGreaterThanOrEqual(10);
    },
  );

  it.each(["horizontal", "vertical"] as const)(
    "exposes data-slot hooks on the default %s step controls rendered after the separator",
    (orientation) => {
      const {container} = renderResizable({group: {orientation}});
      const separator = screen.getByRole("separator");
      const controls = container.querySelector<HTMLElement>("[data-slot='resizable-controls']");
      if (!controls) throw new Error("Missing step-control container");
      expect(separator.nextElementSibling).toBe(controls);
      expect(controls).toHaveAttribute("data-orientation", orientation);
      // Excluded from the primitive's hit-region scan (behaviour guarded by the drag and double-click tests above).
      expect(controls).toHaveAttribute("data-resize-preview");
      const [decrease, increase] = within(controls).getAllByRole("button");
      expect(decrease).toHaveAccessibleName("Decrease previous panel");
      expect(decrease).toHaveAttribute("data-slot", "resizable-decrease");
      expect(decrease).toHaveAttribute("type", "button");
      expect(increase).toHaveAccessibleName("Increase previous panel");
      expect(increase).toHaveAttribute("data-slot", "resizable-increase");
      expect(increase).toHaveAttribute("type", "button");
    },
  );

  it("omits the step controls with withControls={false} and keeps the keyboard separator", () => {
    const groupRef = createRef<GroupImperativeHandle>();
    const {container} = renderResizable({group: {groupRef}, handle: {withControls: false, withHandle: true}});
    notifyResize();
    const separator = screen.getByRole("separator", {name: "Resize panels"});
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelector("[data-slot^='resizable-']")).toBeNull();
    expect(separator).not.toHaveAttribute("withcontrols");
    expect(separator.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    fireEvent.keyDown(separator, {key: "ArrowRight"});
    expect(groupRef.current?.getLayout()).toEqual({first: 55, second: 45});
  });

  it("preserves element refs and both v4 imperative handles", () => {
    const groupElementRef = createRef<HTMLDivElement>();
    const panelElementRef = createRef<HTMLDivElement>();
    const handleElementRef = createRef<HTMLDivElement>();
    const groupRef = createRef<GroupImperativeHandle>();
    const panelRef = createRef<PanelImperativeHandle>();
    const onLayoutChanged = vi.fn<NonNullable<ResizablePanelGroupProps["onLayoutChanged"]>>();
    const onResize = vi.fn<NonNullable<ResizablePanelProps["onResize"]>>();
    const {unmount} = renderResizable({
      group: {elementRef: groupElementRef, groupRef, onLayoutChanged},
      panel: {elementRef: panelElementRef, panelRef, minSize: "20%", maxSize: "60%", onResize},
      handle: {elementRef: handleElementRef},
    });
    expect(groupElementRef.current).toBe(screen.getByTestId("group"));
    expect(panelElementRef.current).toBe(screen.getByTestId("first"));
    expect(handleElementRef.current).toBe(screen.getByRole("separator"));
    expect(panelRef.current?.getSize()).toEqual({asPercentage: 50, inPixels: 500});

    act(() => {
      expect(groupRef.current?.setLayout({first: 55, second: 45})).toEqual({first: 55, second: 45});
    });
    expect(onLayoutChanged).toHaveBeenLastCalledWith(
      {first: 55, second: 45},
      {isUserInteraction: false, requestedLayout: {first: 55, second: 45}},
    );
    act(() => panelRef.current?.resize("90%"));
    expect(groupRef.current?.getLayout()).toEqual({first: 60, second: 40});
    expect(panelRef.current?.getSize()).toEqual({asPercentage: 60, inPixels: 600});
    notifyResize();
    expect(onResize).toHaveBeenLastCalledWith({asPercentage: 60, inPixels: 600}, "first", undefined);

    unmount();
    expect(groupElementRef.current).toBeNull();
    expect(panelElementRef.current).toBeNull();
    expect(handleElementRef.current).toBeNull();
    expect(groupRef.current).toBeNull();
    expect(panelRef.current).toBeNull();
    expect(observers.size).toBe(0);
  });

  it("preserves collapse and expand through imperative and keyboard paths", () => {
    const panelRef = createRef<PanelImperativeHandle>();
    renderResizable({panel: {panelRef, collapsible: true, minSize: "20%", collapsedSize: "0%"}});
    const separator = screen.getByRole("separator");

    act(() => panelRef.current?.collapse());
    expect(panelRef.current?.isCollapsed()).toBe(true);
    expect(separator).toHaveAttribute("aria-valuenow", "0");
    act(() => panelRef.current?.expand());
    expect(panelRef.current?.isCollapsed()).toBe(false);
    expect(separator).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(separator, {key: "Enter"});
    expect(panelRef.current?.isCollapsed()).toBe(true);
    fireEvent.keyDown(separator, {key: "Enter"});
    expect(separator).toHaveAttribute("aria-valuenow", "50");
  });

  it.each(["group", "handle"] as const)("preserves disabled resizing from the %s", (disabledPart) => {
    const groupRef = createRef<GroupImperativeHandle>();
    renderResizable({group: {groupRef, disabled: disabledPart === "group"}, handle: {disabled: disabledPart === "handle"}});
    const separator = screen.getByRole("separator");
    if (disabledPart === "handle") {
      expect(separator).toHaveAttribute("aria-disabled", "true");
      expect(separator).not.toHaveAttribute("tabindex");
    }
    fireEvent.keyDown(separator, {key: "ArrowRight"});
    fireEvent.pointerDown(separator, {pointerId: 2, pointerType: "mouse", button: 0, buttons: 1, clientX: 500, clientY: 300});
    fireEvent.pointerMove(separator, {pointerId: 2, pointerType: "mouse", buttons: 1, clientX: 600, clientY: 300});
    fireEvent.pointerUp(separator, {pointerId: 2, pointerType: "mouse", buttons: 0, clientX: 600, clientY: 300});
    expect(groupRef.current?.getLayout()).toEqual({first: 50, second: 50});
    expect(separator).not.toHaveAttribute("data-separator", "active");
  });

  it("retains a visible keyboard focus ring without animation", () => {
    renderResizable({handle: {withHandle: true}});
    const separator = screen.getByRole("separator");
    act(() => separator.focus());

    expect(separator).toHaveFocus();
    expect(separator).toHaveAttribute("data-separator", "focus");
    expect(window.getComputedStyle(separator).boxShadow).toContain("0 0 0 1px");
    expect(window.getComputedStyle(separator).animationName).toBe("");
  });

  it("provides forced-color focus and reduced-motion declarations for the real handle", () => {
    renderResizable({handle: {withHandle: true}});
    const separator = screen.getByRole("separator");
    act(() => separator.focus());
    const grip = separator.querySelector("div");
    const sheet = stylesheet.sheet;
    if (!sheet || !grip) throw new Error("Missing stylesheet or grip");
    const mediaRules = Array.from(sheet.cssRules).filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule);
    const forcedColors = mediaRules.find((rule) => rule.conditionText === "(forced-colors: active)");
    const reducedMotion = mediaRules.find((rule) => rule.conditionText === "(prefers-reduced-motion: reduce)");
    expect(forcedColors).toBeDefined();
    expect(reducedMotion).toBeDefined();
    if (!forcedColors || !reducedMotion) throw new Error("Missing accessibility media rules");
    expect(matchedMediaDeclarations(separator, stylesheet, "(forced-colors: active)")["background-color"]).toBe("CanvasText");
    expect(matchedMediaDeclarations(separator, stylesheet, "(forced-colors: active)")["outline"]).toContain("Highlight");
    expect(matchedMediaDeclarations(grip, stylesheet, "(forced-colors: active)")["border-color"]).toBe("CanvasText");
    expect(matchedMediaDeclarations(grip, stylesheet, "(forced-colors: active)")["background-color"]).toBe("Canvas");
    expect(matchedDeclarations(separator, reducedMotion.cssRules).transition).toBe("none");
    expect(matchedDeclarations(grip, reducedMotion.cssRules).animation).toBe("none");
  });

  it("derives public prop and ref contracts from the installed v4 types", () => {
    expectTypeOf<ResizablePanelGroupProps>().toEqualTypeOf<GroupProps>();
    expectTypeOf<ResizablePanelProps>().toEqualTypeOf<PanelProps>();
    expectTypeOf<Omit<ResizableHandleProps, "withHandle">>().toExtend<SeparatorProps>();
    expectTypeOf<SeparatorProps>().toExtend<Omit<ResizableHandleProps, "withHandle">>();
    expectTypeOf<ResizablePanelGroupProps["groupRef"]>().toEqualTypeOf<GroupProps["groupRef"]>();
    expectTypeOf<ResizablePanelProps["panelRef"]>().toEqualTypeOf<PanelProps["panelRef"]>();
    expectTypeOf<ResizableHandleProps["elementRef"]>().toEqualTypeOf<SeparatorProps["elementRef"]>();
  });
});
