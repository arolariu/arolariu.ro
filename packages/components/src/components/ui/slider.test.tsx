import {Slider as BaseSlider} from "@base-ui/react/slider";
import {act, fireEvent, render as renderComponent, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {Slider} from "./slider";
import * as stories from "./slider.stories";

async function render(element: React.ReactElement): Promise<ReturnType<typeof renderComponent>> {
  return act(async () => renderComponent(element));
}

function getPart(container: HTMLElement, slot: string): HTMLElement {
  const part = container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  if (!part) throw new Error(`Missing slider part: ${slot}`);
  return part;
}

describe("Slider", () => {
  it("applies playground controls to the real Slider and supplies vertical story geometry", async () => {
    const {Default} = composeStories(stories);
    const {container} = await render(
      <Default
        orientation='vertical'
        disabled
        thumbAlignment='center'
      />,
    );
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(container.firstElementChild?.className).toContain("storyVertical");
  });

  beforeEach(() => {
    // Happy DOM has no layout. Supply only the measurement boundary; Base UI owns value/position math.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element): DOMRect {
      const vertical = this.closest('[data-slot="slider"]')?.getAttribute("data-orientation") === "vertical";
      if (this.getAttribute("data-slot") === "slider-thumb") {
        const input = this.querySelector("input");
        const min = Number(input?.min ?? 0);
        const max = Number(input?.max ?? 100);
        const fraction = ((input?.valueAsNumber ?? min) - min) / (max - min);
        return vertical ? new DOMRect(10, 220 - 200 * fraction, 20, 20) : new DOMRect(10 + 200 * fraction, 20, 20, 20);
      }
      return vertical ? new DOMRect(10, 20, 20, 220) : new DOMRect(10, 20, 220, 20);
    });
    const capturedPointers = new Map<Element, Set<number>>();
    vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(function (this: Element, pointerId: number): void {
      const captures = capturedPointers.get(this) ?? new Set<number>();
      captures.add(pointerId);
      capturedPointers.set(this, captures);
    });
    vi.spyOn(Element.prototype, "hasPointerCapture").mockImplementation(function (this: Element, pointerId: number): boolean {
      return capturedPointers.get(this)?.has(pointerId) ?? false;
    });
    vi.spyOn(Element.prototype, "releasePointerCapture").mockImplementation(function (this: Element, pointerId: number): void {
      capturedPointers.get(this)?.delete(pointerId);
    });
  });

  it("renders an independently focusable thumb for each range endpoint", async () => {
    await render(
      <Slider
        aria-label='Price range'
        defaultValue={[25, 75]}
      />,
    );
    const thumbs = await screen.findAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
  });

  it.each([
    {min: undefined, max: undefined, expected: "0"},
    {min: 20, max: 80, expected: "20"},
  ])("characterizes the primitive's omitted value as a single minimum ($expected)", async ({min, max, expected}) => {
    await render(
      <BaseSlider.Root
        min={min}
        max={max}
        render={(props, state) => (
          <div
            {...props}
            data-testid='primitive-root'
            data-values={JSON.stringify(state.values)}
          />
        )}>
        <BaseSlider.Control>
          <BaseSlider.Track>
            <BaseSlider.Indicator />
          </BaseSlider.Track>
          <BaseSlider.Thumb index={0} />
        </BaseSlider.Control>
      </BaseSlider.Root>,
    );
    expect(screen.getByTestId("primitive-root")).toHaveAttribute("data-values", `[${expected}]`);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", expected);
  });

  it("keeps the primitive's single minimum default without manufacturing a maximum thumb", async () => {
    await render(
      <Slider
        aria-label='Default value'
        min={20}
        max={80}
      />,
    );
    expect(await screen.findAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "20");
  });

  it.each(
    (["controlled", "uncontrolled"] as const).flatMap((mode) =>
      [
        {value: 127, expected: [100], name: "out-of-range"},
        {value: [80, 20], expected: [20, 80], name: "reversed"},
        {value: 23, expected: [23], name: "off-step"},
      ].map((sample) => ({mode, ...sample})),
    ),
  )("characterizes $mode $name initial values against the real SDK without wrapper normalization", async ({mode, value, expected}) => {
    const valueProps = mode === "controlled" ? {value} : {defaultValue: value};
    await render(
      <>
        <BaseSlider.Root<number | readonly number[]>
          {...valueProps}
          min={0}
          max={100}
          step={10}
          render={(props, state) => (
            <div
              {...props}
              data-testid='sdk-values'
              data-values={JSON.stringify(state.values)}
            />
          )}
        />
        <Slider<number | readonly number[]>
          {...valueProps}
          min={0}
          max={100}
          step={10}
          render={(props, state) => (
            <div
              {...props}
              data-testid='wrapper-values'
              data-values={JSON.stringify(state.values)}
            />
          )}
        />
      </>,
    );
    expect(screen.getByTestId("sdk-values")).toHaveAttribute("data-values", JSON.stringify(expected));
    expect(screen.getByTestId("wrapper-values")).toHaveAttribute("data-values", JSON.stringify(expected));
  });

  it("does not manufacture a thumb for an explicitly empty range", async () => {
    await render(
      <Slider
        aria-label='Empty range'
        defaultValue={[]}
      />,
    );
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("preserves scalar values and typed change/commit details", async () => {
    const user = userEvent.setup();
    const changes: number[] = [];
    const reasons: string[] = [];
    const commits: number[] = [];
    await render(
      <Slider
        aria-label='Scalar value'
        defaultValue={20}
        step={10}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.ChangeEventDetails>();
          changes.push(value);
          reasons.push(details.reason);
          expect(details.activeThumbIndex).toBe(0);
          expect(details.event).toBeInstanceOf(KeyboardEvent);
        }}
        onValueCommitted={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.CommitEventDetails>();
          commits.push(value);
          expect(details.reason).toBe("keyboard");
          expect(details.event).toBeInstanceOf(KeyboardEvent);
        }}
      />,
    );
    const thumb = await screen.findByRole("slider");
    act(() => thumb.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
    expect(changes).toEqual([30]);
    expect(reasons).toEqual(["keyboard"]);
    expect(commits).toEqual([30]);
  });

  it("does not let an array default add phantom thumbs to a controlled scalar", async () => {
    await render(
      <Slider<number | readonly number[]>
        aria-label='Controlled scalar'
        value={40}
        defaultValue={[25, 75]}
      />,
    );
    expect(await screen.findAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "40");
  });

  it("preserves readonly ranges without converting them to scalar callbacks", async () => {
    const user = userEvent.setup();
    const range: readonly number[] = [25, 75];
    const changes: (readonly number[])[] = [];
    await render(
      <Slider
        aria-label='Readonly range'
        defaultValue={range}
        step={5}
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<readonly number[]>();
          expectTypeOf(details).toEqualTypeOf<BaseSlider.Root.ChangeEventDetails>();
          changes.push(value);
          expect(details.activeThumbIndex).toBe(1);
        }}
      />,
    );
    const thumbs = await screen.findAllByRole("slider");
    act(() => thumbs[1]?.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    expect(changes).toEqual([[25, 80]]);
    expect(range).toEqual([25, 75]);
  });

  it("lets the primitive cancel a change without committing it", async () => {
    const user = userEvent.setup();
    const committed = vi.fn<NonNullable<BaseSlider.Root.Props<number>["onValueCommitted"]>>();
    await render(
      <Slider
        aria-label='Canceled change'
        defaultValue={25}
        onValueChange={(_value, details) => details.cancel()}
        onValueCommitted={committed}
      />,
    );
    const thumb = await screen.findByRole("slider");
    act(() => thumb.focus());
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "25");
    expect(committed).not.toHaveBeenCalled();
  });

  it("passes live primitive state to render and className callbacks", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLDivElement>();
    await render(
      <Slider
        ref={ref}
        aria-label='Composed range'
        defaultValue={[25, 75]}
        orientation='vertical'
        className={(state) => (state.activeThumbIndex === 1 ? "second-active" : "idle")}
        render={(props, state) => (
          <div
            {...props}
            data-testid='composed-root'
            data-values={JSON.stringify(state.values)}
            data-active-index={state.activeThumbIndex}>
            <span>Custom content</span>
            {props.children}
          </div>
        )}
      />,
    );
    const root = screen.getByTestId("composed-root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("idle");
    expect(root).toHaveAttribute("data-values", "[25,75]");
    expect(root).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByText("Custom content")).toBeInTheDocument();
    const thumbs = await screen.findAllByRole("slider");
    act(() => thumbs[1]?.focus());
    await user.keyboard("{ArrowUp}");
    expect(root).toHaveClass("second-active");
    expect(root).toHaveAttribute("data-active-index", "1");
    expect(root).toHaveAttribute("data-values", "[25,76]");
  });

  it("preserves render element refs and merged handlers alongside generated thumbs", async () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const elementRef = React.createRef<HTMLDivElement>();
    const rootClick = vi.fn();
    const elementClick = vi.fn();
    await render(
      <Slider
        ref={rootRef}
        aria-label='Element composition'
        defaultValue={[25, 75]}
        onClick={rootClick}
        render={
          <div
            ref={elementRef}
            className='composed-element'
            onClick={elementClick}
          />
        }
      />,
    );
    const root = screen.getByRole("group", {name: "Element composition"});
    expect(rootRef.current).toBe(root);
    expect(elementRef.current).toBe(root);
    expect(root).toHaveClass("composed-element");
    expect(await screen.findAllByRole("slider")).toHaveLength(2);
    fireEvent.click(root);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(elementClick).toHaveBeenCalledTimes(1);
  });

  it("preserves supplied child content while composing the generated slider", async () => {
    await render(
      <Slider
        aria-label='Slider with content'
        defaultValue={[25, 75]}>
        <span>Supporting content</span>
      </Slider>,
    );
    expect(screen.getByText("Supporting content")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("retains the primitive render element's child-content replacement contract", async () => {
    await render(
      <Slider
        aria-label='Replaced content'
        defaultValue={[25, 75]}
        render={
          <div>
            <span>Replacement content</span>
          </div>
        }
      />,
    );
    expect(screen.getByRole("group", {name: "Replaced content"})).toBeInTheDocument();
    expect(screen.getByText("Replacement content")).toBeInTheDocument();
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(document.querySelector('[data-slot="slider-control"]')).toBeNull();
    expect(document.querySelector('[data-slot="slider-thumb"]')).toBeNull();
  });

  it("forwards the center alignment override without replacing primitive positioning", async () => {
    const {container} = await render(
      <Slider
        aria-label='Centered thumbs'
        defaultValue={[0, 100]}
        thumbAlignment='center'
      />,
    );
    const thumbs = container.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]');
    expect(thumbs[0]?.style.insetInlineStart).toBe("0%");
    expect(thumbs[1]?.style.insetInlineStart).toBe("100%");
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it.each(["horizontal", "vertical"] as const)("supports controlled keyboard changes at both %s endpoints", async (orientation) => {
    const user = userEvent.setup();
    const changes: number[][] = [];
    const activeIndices: number[] = [];
    const commits: number[][] = [];
    function ControlledRange(): React.JSX.Element {
      const [value, setValue] = React.useState([25, 75]);
      return (
        <Slider
          aria-label='Controlled range'
          orientation={orientation}
          value={value}
          step={5}
          onValueChange={(nextValue, details) => {
            expectTypeOf(nextValue).toEqualTypeOf<number[]>();
            setValue(nextValue);
            changes.push(nextValue);
            activeIndices.push(details.activeThumbIndex);
          }}
          onValueCommitted={(nextValue, details) => {
            commits.push(nextValue);
            expect(details.reason).toBe("keyboard");
          }}
        />
      );
    }
    await render(<ControlledRange />);
    const thumbs = screen.getAllByRole("slider");
    await user.tab();
    expect(thumbs[0]).toHaveFocus();
    await user.keyboard(orientation === "vertical" ? "{ArrowUp}" : "{ArrowRight}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "30");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
    await user.tab();
    expect(thumbs[1]).toHaveFocus();
    await user.keyboard(orientation === "vertical" ? "{ArrowDown}" : "{ArrowLeft}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "30");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "70");
    expect(changes).toEqual([
      [30, 75],
      [30, 70],
    ]);
    expect(commits).toEqual(changes);
    expect(activeIndices).toEqual([0, 1]);
  });

  it("reconciles controlled endpoint counts without retaining stale or phantom thumbs", async () => {
    const {rerender} = await render(
      <Slider
        aria-label='Changing range'
        value={[25, 75]}
      />,
    );
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    await act(async () => {
      rerender(
        <Slider
          aria-label='Changing range'
          value={[10, 50, 90]}
        />,
      );
    });
    await waitFor(() => {
      expect(screen.getAllByRole("slider")).toHaveLength(3);
    });
    expect(screen.getAllByRole("slider").map((thumb) => thumb.getAttribute("aria-valuenow"))).toEqual(["10", "50", "90"]);
    await act(async () => {
      rerender(
        <Slider
          aria-label='Changing range'
          value={[]}
        />,
      );
    });
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it.each(["horizontal", "vertical"] as const)("keeps min/max/step and minimum endpoint separation in %s mode", async (orientation) => {
    const user = userEvent.setup();
    await render(
      <Slider
        aria-label='Bounded range'
        orientation={orientation}
        defaultValue={[20, 80]}
        min={10}
        max={90}
        step={5}
        minStepsBetweenValues={2}
      />,
    );
    const thumbs = screen.getAllByRole("slider");
    await user.tab();
    await user.keyboard("{Home}{ArrowLeft}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "10");
    await user.keyboard("{End}");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "70");
    await user.tab();
    await user.keyboard("{End}{ArrowRight}");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "90");
    await user.keyboard("{Home}");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    for (const thumb of thumbs) {
      expect(thumb).toHaveAttribute("min", "10");
      expect(thumb).toHaveAttribute("max", "90");
      expect(thumb).toHaveAttribute("step", "5");
      expect(thumb).toHaveAttribute("aria-orientation", orientation);
    }
  });

  it("submits every endpoint using the primitive's named form controls", async () => {
    const {container} = await render(
      <>
        <form
          id='range-form'
          aria-label='Range form'
        />
        <Slider
          aria-label='Named range'
          name='price'
          form='range-form'
          defaultValue={[25, 75]}
        />
      </>,
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    expect(new FormData(form).getAll("price")).toEqual(["25", "75"]);
    const thumbs = screen.getAllByRole("slider");
    const upperThumb = thumbs[1];
    if (!upperThumb) throw new Error("Missing upper endpoint");
    fireEvent.change(upperThumb, {target: {value: "80"}});
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    expect(new FormData(form).getAll("price")).toEqual(["25", "80"]);
  });

  it.each(["horizontal", "vertical"] as const)("exposes primitive orientation on every styled %s part", async (orientation) => {
    const {container} = await render(
      <Slider
        aria-label='Styled range'
        defaultValue={[25, 75]}
        orientation={orientation}
      />,
    );
    for (const slot of ["slider", "slider-control", "slider-track", "slider-range", "slider-thumb"]) {
      const part = getPart(container, slot);
      expect(part).toHaveAttribute("data-orientation", orientation);
      expect(part.className).not.toBe("");
    }
    expect(container.querySelectorAll('[data-slot="slider-thumb"]')).toHaveLength(2);
  });

  it.each([
    {
      orientation: "horizontal",
      first: {clientX: 60, clientY: 30},
      firstMove: {clientX: 80, clientY: 30},
      second: {clientX: 160, clientY: 30},
    },
    {
      orientation: "vertical",
      first: {clientX: 20, clientY: 190},
      firstMove: {clientX: 20, clientY: 170},
      second: {clientX: 20, clientY: 90},
    },
  ] as const)("updates both endpoints with real $orientation pointer interactions", async ({orientation, first, firstMove, second}) => {
    const changes: (readonly number[])[] = [];
    const changeReasons: string[] = [];
    const indices: number[] = [];
    const commits: (readonly number[])[] = [];
    const commitReasons: string[] = [];
    const {container} = await render(
      <Slider
        aria-label='Pointer range'
        orientation={orientation}
        defaultValue={[25, 75]}
        step={5}
        className={(state) => (state.dragging ? "dragging" : undefined)}
        render={(props, state) => (
          <div
            {...props}
            data-dragging-state={String(state.dragging)}
          />
        )}
        onValueChange={(value, details) => {
          changes.push(value);
          changeReasons.push(details.reason);
          indices.push(details.activeThumbIndex);
          expect(details.event).toBeInstanceOf(PointerEvent);
        }}
        onValueCommitted={(value, details) => {
          commits.push(value);
          commitReasons.push(details.reason);
          expect(details.event).toBeInstanceOf(PointerEvent);
        }}
      />,
    );
    const control = getPart(container, "slider-control");
    const root = getPart(container, "slider");
    const firstThumb = getPart(container, "slider-thumb");
    const thumbs = screen.getAllByRole("slider");
    const pointer = {pointerId: 1, pointerType: "mouse", button: 0, buttons: 1};
    fireEvent.pointerDown(firstThumb, {...pointer, ...first});
    expect(root).toHaveClass("dragging");
    expect(root).toHaveAttribute("data-dragging-state", "true");
    expect(firstThumb).toHaveAttribute("data-dragging");
    expect(control.hasPointerCapture(1)).toBe(true);
    expect(changes).toEqual([]);
    fireEvent.pointerMove(document, {...pointer, ...firstMove});
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "35");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
    fireEvent.pointerUp(document, {...pointer, buttons: 0, ...firstMove});
    expect(control.hasPointerCapture(1)).toBe(false);
    expect(root).not.toHaveClass("dragging");
    expect(root).toHaveAttribute("data-dragging-state", "false");
    expect(firstThumb).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(control, {...pointer, ...second});
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "35");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "70");
    fireEvent.pointerMove(document, {
      ...pointer,
      ...(orientation === "horizontal" ? {clientX: 180, clientY: 30} : {clientX: 20, clientY: 70}),
    });
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    fireEvent.pointerUp(document, {...pointer, buttons: 0});
    expect(changes).toEqual([
      [35, 75],
      [35, 70],
      [35, 80],
    ]);
    expect(commits).toEqual([
      [35, 75],
      [35, 80],
    ]);
    expect(changeReasons).toEqual(["drag", "track-press", "drag"]);
    expect(commitReasons).toEqual(["drag", "drag"]);
    expect(indices).toEqual([0, 1, 1]);
  });

  it.each(["horizontal", "vertical"] as const)(
    "keeps disabled %s ranges unfocusable, unsubmitted and non-interactive",
    async (orientation) => {
      const user = userEvent.setup();
      const change = vi.fn();
      const commit = vi.fn();
      const {container} = await render(
        <form aria-label='Disabled form'>
          <Slider
            aria-label='Disabled range'
            orientation={orientation}
            name='disabled-range'
            defaultValue={[25, 75]}
            disabled
            onValueChange={change}
            onValueCommitted={commit}
          />
        </form>,
      );
      const thumbs = screen.getAllByRole("slider");
      for (const thumb of thumbs) expect(thumb).toBeDisabled();
      await user.tab();
      expect(thumbs[0]).not.toHaveFocus();
      expect(thumbs[1]).not.toHaveFocus();
      await user.keyboard("{ArrowRight}{ArrowUp}");
      const control = getPart(container, "slider-control");
      fireEvent.pointerDown(control, {pointerId: 1, button: 0, buttons: 1, clientX: 180, clientY: 70});
      fireEvent.pointerMove(document, {pointerId: 1, buttons: 1, clientX: 210, clientY: 40});
      fireEvent.pointerUp(document, {pointerId: 1});
      expect(thumbs[0]).toHaveAttribute("aria-valuenow", "25");
      expect(thumbs[1]).toHaveAttribute("aria-valuenow", "75");
      expect(change).not.toHaveBeenCalled();
      expect(commit).not.toHaveBeenCalled();
      const form = container.querySelector("form");
      if (!form) throw new Error("Missing disabled form");
      expect(new FormData(form).getAll("disabled-range")).toEqual([]);
      expect(control).toHaveAttribute("data-disabled");
    },
  );

  it("renders without crashing", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Volume'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Volume"})).toBeInTheDocument();
    expect(await screen.findByRole("slider")).toBeInTheDocument();
  });

  it("forwards its ref to the slider root DOM element", async () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();
    const {container} = await render(
      <Slider
        ref={ref}
        aria-label='Forwarded slider'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(ref.current).toBe(container.firstElementChild);
  });

  it("merges custom class names", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Styled slider'
        defaultValue={[25]}
        className='custom-slider'
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled slider"})).toHaveClass("custom-slider");
  });

  it("updates value when changed with keyboard input", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: number[], eventDetails: unknown) => void>();

    await render(
      <Slider
        aria-label='Brightness'
        defaultValue={[20]}
        min={0}
        max={100}
        step={10}
        onValueChange={handleValueChange}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Brightness"})).toBeInTheDocument();

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "30");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual([30]);
  });

  it("marks disabled sliders with data-disabled", async () => {
    // Arrange
    const {container} = await render(
      <Slider
        aria-label='Disabled slider'
        defaultValue={[20]}
        disabled
      />,
    );

    // Assert
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("supports keyboard adjustments with arrow keys", async () => {
    // Arrange
    const user = userEvent.setup();

    await render(
      <Slider
        aria-label='Contrast'
        defaultValue={[50]}
        min={0}
        max={100}
        step={10}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Contrast"})).toBeInTheDocument();

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}{ArrowLeft}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("exposes accessible slider semantics", async () => {
    // Arrange
    await render(
      <Slider
        aria-label='Accessible slider'
        value={[40]}
        min={0}
        max={100}
      />,
    );

    const slider = await screen.findByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Accessible slider"})).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-orientation", "horizontal");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: number[]) => void>();

    function ControlledSlider(): React.JSX.Element {
      const [value, setValue] = React.useState<number[]>([20]);

      return (
        <Slider
          aria-label='Controlled slider'
          value={value}
          min={0}
          max={100}
          step={10}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}
        />
      );
    }

    await render(<ControlledSlider />);

    const slider = await screen.findByRole("slider");

    expect(slider).toHaveAttribute("aria-valuenow", "20");

    // Act
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith([30]);
    expect(slider).toHaveAttribute("aria-valuenow", "30");
  });
});
