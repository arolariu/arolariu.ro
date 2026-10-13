import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./number-field";

describe("NumberField", () => {
  function statefulField(value: number, disabled: boolean): React.ReactElement {
    return (
      <NumberField
        value={value}
        disabled={disabled}
        className={(state) => `root-value-${state.value}`}
        render={(props, state) => (
          <div
            {...props}
            data-testid='root'
            data-contract-value={state.value}
            data-contract-disabled={String(state.disabled)}
          />
        )}>
        <NumberFieldGroup
          className={(state) => `group-value-${state.value}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='group'
              data-contract-value={state.value}
              data-contract-disabled={String(state.disabled)}
            />
          )}>
          <NumberFieldInput
            className={(state) => `input-value-${state.value}`}
            render={(props, state) => (
              <input
                {...props}
                data-testid='input'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldIncrement
            className={(state) => `increment-value-${state.value}`}
            render={(props, state) => (
              <button
                {...props}
                data-testid='increment'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldDecrement
            className={(state) => `decrement-value-${state.value}`}
            render={(props, state) => (
              <button
                {...props}
                data-testid='decrement'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldScrubArea
            className={(state) => `scrub-value-${state.value}`}
            render={(props, state) => (
              <span
                {...props}
                data-testid='scrub'
                data-contract-value={state.value}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
        </NumberFieldGroup>
      </NumberField>
    );
  }

  it.each(["root", "group", "input", "increment", "decrement", "scrub"])(
    "supplies owning value state and className callbacks to %s",
    (part) => {
      const {rerender} = render(statefulField(7, true));
      const element = screen.getByTestId(part);
      expect(element).toHaveAttribute("data-contract-value", "7");
      expect(element).toHaveAttribute("data-contract-disabled", "true");
      expect(element).toHaveClass(`${part}-value-7`);

      rerender(statefulField(11, false));
      expect(screen.getByTestId(part)).toBe(element);
      expect(element).toHaveAttribute("data-contract-value", "11");
      expect(element).toHaveAttribute("data-contract-disabled", "false");
      expect(element).toHaveClass(`${part}-value-11`);
      expect(screen.getByRole("textbox")).toHaveValue("11");
    },
  );

  it.each(["element", "callback"] as const)("preserves every %s-rendered part's children, classes, refs and cleanup", (mode) => {
    const attached: HTMLElement[] = [];
    const cleaned = vi.fn<(node: HTMLElement) => void>();
    const renderCleaned = vi.fn<(node: HTMLElement) => void>();
    const ref = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      attached.push(node);
      return () => cleaned(node);
    };
    const renderRef = (node: HTMLElement | null): (() => void) | undefined => (node ? () => renderCleaned(node) : undefined);
    const inputRef = React.createRef<HTMLInputElement>();
    const {unmount} = render(
      <NumberField
        ref={ref}
        inputRef={inputRef}
        defaultValue={2}
        className='root-custom'
        data-testid='root'
        render={
          mode === "element" ? (
            <div
              ref={renderRef}
              className='root-render'
            />
          ) : (
            (props) => <div {...props} />
          )
        }>
        <NumberFieldGroup
          ref={ref}
          data-testid='group'
          className='group-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='group-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }>
          <NumberFieldInput
            ref={ref}
            className='input-custom'
            aria-label='Quantity'
            render={
              mode === "element" ? (
                <input
                  ref={renderRef}
                  className='input-render'
                />
              ) : (
                (props) => <input {...props} />
              )
            }
          />
          <NumberFieldIncrement
            ref={ref}
            className='increment-custom'
            render={
              mode === "element" ? (
                <button
                  ref={renderRef}
                  className='increment-render'>
                  Rendered increase
                </button>
              ) : (
                (props) => <button {...props} />
              )
            }>
            Wrapper increase
          </NumberFieldIncrement>
          <NumberFieldDecrement
            ref={ref}
            className='decrement-custom'
            render={
              mode === "element" ? (
                <button
                  ref={renderRef}
                  className='decrement-render'>
                  Rendered decrease
                </button>
              ) : (
                (props) => <button {...props} />
              )
            }>
            Wrapper decrease
          </NumberFieldDecrement>
          <NumberFieldScrubArea
            ref={ref}
            data-testid='scrub'
            className='scrub-custom'
            render={
              mode === "element" ? (
                <span
                  ref={renderRef}
                  className='scrub-render'>
                  Rendered scrub
                </span>
              ) : (
                (props) => <span {...props} />
              )
            }>
            Wrapper scrub
          </NumberFieldScrubArea>
        </NumberFieldGroup>
      </NumberField>,
    );
    const parts = {
      root: screen.getByTestId("root"),
      group: screen.getByTestId("group"),
      input: screen.getByRole("textbox", {name: "Quantity"}),
      increment: screen.getByRole("button", {name: "Increase"}),
      decrement: screen.getByRole("button", {name: "Decrease"}),
      scrub: screen.getByTestId("scrub"),
    };
    for (const [part, node] of Object.entries(parts)) {
      expect(attached).toContain(node);
      expect(node).toHaveClass(`${part}-custom`);
      if (mode === "element") expect(node).toHaveClass(`${part}-render`);
    }
    expect(inputRef.current).not.toBe(parts.input);
    expect(inputRef.current).toHaveAttribute("type", "number");
    expect(inputRef.current).toHaveAttribute("aria-hidden", "true");
    expect(inputRef.current).toHaveValue(2);
    expect(parts.input).toHaveValue("2");
    expect(parts.increment).toHaveTextContent(mode === "element" ? "Rendered increase" : "Wrapper increase");
    expect(parts.decrement).toHaveTextContent(mode === "element" ? "Rendered decrease" : "Wrapper decrease");
    expect(parts.scrub).toHaveTextContent(mode === "element" ? "Rendered scrub" : "Wrapper scrub");
    unmount();
    expect(inputRef.current).toBeNull();
    for (const node of Object.values(parts)) {
      expect(cleaned).toHaveBeenCalledWith(node);
      if (mode === "element") expect(renderCleaned).toHaveBeenCalledWith(node);
    }
    expect(cleaned).toHaveBeenCalledTimes(6);
    expect(renderCleaned).toHaveBeenCalledTimes(mode === "element" ? 6 : 0);
  });

  it("parses localized input and preserves numeric form submission, callbacks and blur formatting", async () => {
    const user = userEvent.setup();
    const values: Array<number | null> = [];
    const commits: Array<number | null> = [];
    render(
      <form aria-label='Order'>
        <NumberField
          name='quantity'
          defaultValue={1.5}
          locale='de-DE'
          step={0.25}
          min={0}
          max={10}
          onValueChange={(value) => values.push(value)}
          onValueCommitted={(value) => commits.push(value)}>
          <NumberFieldGroup>
            <NumberFieldInput aria-label='Quantity' />
            <NumberFieldIncrement />
            <NumberFieldDecrement />
          </NumberFieldGroup>
        </NumberField>
      </form>,
    );
    const input = screen.getByRole("textbox", {name: "Quantity"});
    const form = screen.getByRole<HTMLFormElement>("form", {name: "Order"});
    expect(input).toHaveValue("1,5");
    await user.clear(input);
    await user.type(input, "2,75");
    await user.tab();
    expect(input).toHaveValue("2,75");
    expect(values.at(-1)).toBe(2.75);
    expect(commits.at(-1)).toBe(2.75);
    expect(new FormData(form).get("quantity")).toBe("2.75");
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(input).toHaveValue("3");
    expect(values.at(-1)).toBe(3);
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    expect(input).toHaveValue("2,75");
    expect(values.at(-1)).toBe(2.75);
  });

  it("honors steps, keyboard modifiers and min/max bounds with state-aware disabled steppers", async () => {
    const user = userEvent.setup();
    render(
      <NumberField
        defaultValue={1}
        min={1}
        max={9}
        step={2}
        smallStep={1}
        largeStep={4}>
        <NumberFieldGroup>
          <NumberFieldInput aria-label='Quantity' />
          <NumberFieldIncrement
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
          <NumberFieldDecrement
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}
          />
        </NumberFieldGroup>
      </NumberField>,
    );
    const input = screen.getByRole("textbox", {name: "Quantity"});
    const increase = screen.getByRole("button", {name: "Increase"});
    const decrease = screen.getByRole("button", {name: "Decrease"});
    expect(decrease).toHaveAttribute("data-contract-disabled", "true");
    await user.click(increase);
    expect(input).toHaveValue("3");
    input.focus();
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("5");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(input).toHaveValue("9");
    expect(increase).toHaveAttribute("data-contract-disabled", "true");
    await user.click(increase);
    expect(input).toHaveValue("9");
    input.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(input).toHaveValue("8");
    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    expect(input).toHaveValue("9");
    await user.clear(input);
    await user.type(input, "-5");
    await user.tab();
    expect(input).toHaveValue("5");
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    expect(input).toHaveValue("1");
    expect(decrease).toHaveAttribute("data-contract-disabled", "true");
  });

  it("retains controlled value until the caller rerenders and honors canceled value changes", async () => {
    const user = userEvent.setup();
    const values: Array<number | null> = [];
    const fixture = (value: number): React.ReactElement => (
      <NumberField
        value={value}
        onValueChange={(nextValue) => values.push(nextValue)}>
        <NumberFieldInput aria-label='Controlled quantity' />
        <NumberFieldIncrement />
      </NumberField>
    );
    const {rerender, unmount} = render(fixture(2));
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(values).toEqual([3]);
    expect(screen.getByRole("textbox")).toHaveValue("2");
    rerender(fixture(3));
    expect(screen.getByRole("textbox")).toHaveValue("3");
    unmount();

    render(
      <NumberField
        defaultValue={4}
        onValueChange={(_, details) => details.cancel()}>
        <NumberFieldInput aria-label='Cancelable quantity' />
        <NumberFieldIncrement />
      </NumberField>,
    );
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(screen.getByRole("textbox")).toHaveValue("4");
  });

  it("merges rendered stepper events and supports canceling primitive activation", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    render(
      <NumberField defaultValue={2}>
        <NumberFieldInput aria-label='Quantity' />
        <NumberFieldIncrement
          onClick={() => clicks.push("wrapper")}
          render={<button onClick={() => clicks.push("render")} />}
        />
        <NumberFieldDecrement
          onClick={(event) => {
            clicks.push("canceled");
            event.preventBaseUIHandler();
          }}
          onPointerDown={(event) => event.preventBaseUIHandler()}
        />
      </NumberField>,
    );
    await user.click(screen.getByRole("button", {name: "Increase"}));
    expect(clicks).toEqual(["render", "wrapper"]);
    expect(screen.getByRole("textbox")).toHaveValue("3");
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    expect(clicks).toEqual(["render", "wrapper", "canceled"]);
    expect(screen.getByRole("textbox")).toHaveValue("3");
  });

  it.each(["disabled", "readOnly"] as const)("blocks text entry, steppers and scrubbing when %s", async (mode) => {
    const user = userEvent.setup();
    const changes: Array<number | null> = [];
    render(
      <NumberField
        defaultValue={2}
        disabled={mode === "disabled"}
        readOnly={mode === "readOnly"}
        onValueChange={(value) => changes.push(value)}>
        <NumberFieldInput aria-label='Unavailable quantity' />
        <NumberFieldIncrement />
        <NumberFieldDecrement />
        <NumberFieldScrubArea
          data-testid='scrub'
          render={(props, state) => (
            <span
              {...props}
              data-contract-scrubbing={String(state.scrubbing)}
            />
          )}
        />
      </NumberField>,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "9");
    await user.click(screen.getByRole("button", {name: "Increase"}));
    await user.click(screen.getByRole("button", {name: "Decrease"}));
    await user.pointer([{target: screen.getByTestId("scrub"), keys: "[MouseLeft>]"}, {keys: "[/MouseLeft]"}]);
    expect(input).toHaveValue("2");
    expect(screen.getByTestId("scrub")).toHaveAttribute("data-contract-scrubbing", "false");
    expect(changes).toEqual([]);
  });

  it.each([
    {direction: "horizontal" as const, movementX: 3, movementY: 0},
    {direction: "vertical" as const, movementX: 0, movementY: -3},
  ])("preserves real $direction scrubbing, bounds, state callbacks and release commits", async ({direction, movementX, movementY}) => {
    const user = userEvent.setup();
    const changes: Array<number | null> = [];
    const commits: Array<number | null> = [];
    render(
      <NumberField
        defaultValue={2}
        min={0}
        max={4}
        onValueChange={(value) => changes.push(value)}
        onValueCommitted={(value) => commits.push(value)}>
        <NumberFieldInput aria-label='Scrub quantity' />
        <NumberFieldScrubArea
          direction={direction}
          pixelSensitivity={1}
          data-testid='scrub'
          className={(state) => (state.scrubbing ? "active-scrub" : "idle-scrub")}
          render={(props, state) => (
            <span
              {...props}
              data-contract-scrubbing={String(state.scrubbing)}
            />
          )}
        />
      </NumberField>,
    );
    const scrub = screen.getByTestId("scrub");
    await user.pointer({target: scrub, keys: "[MouseLeft>]"});
    expect(scrub).toHaveAttribute("data-contract-scrubbing", "true");
    expect(scrub).toHaveClass("active-scrub");
    const movement = new PointerEvent("pointermove", {bubbles: true, pointerType: "mouse"});
    Object.defineProperties(movement, {
      movementX: {value: movementX},
      movementY: {value: movementY},
    });
    fireEvent(window, movement);
    expect(screen.getByRole("textbox")).toHaveValue("4");
    expect(changes.at(-1)).toBe(4);
    await user.pointer({keys: "[/MouseLeft]"});
    expect(scrub).toHaveAttribute("data-contract-scrubbing", "false");
    expect(scrub).toHaveClass("idle-scrub");
    expect(commits.at(-1)).toBe(4);
  });

  function renderNumberField(className?: string): ReturnType<typeof render> {
    return render(
      <NumberField
        aria-label='Quantity'
        className={className}
        defaultValue={2}
        step={1}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderNumberField();

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("increments and decrements the displayed value", async () => {
    // Arrange
    const user = userEvent.setup();
    renderNumberField();
    const input = screen.getByRole("textbox");

    // Act
    await user.click(screen.getByRole("button", {name: "Increase"}));
    await user.click(screen.getByRole("button", {name: "Decrease"}));

    // Assert
    expect(input).toHaveValue("2");
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = renderNumberField("custom-number-field");

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-number-field");
  });

  it("renders custom increment children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={2}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement>Increase</NumberFieldIncrement>
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Increase"})).toBeInTheDocument();
  });

  it("renders default increment symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const incrementButton = screen.getByRole("button", {name: "Increase"});
    expect(incrementButton).toHaveTextContent("+");
  });

  it("renders default decrement symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const decrementButton = screen.getByRole("button", {name: "Decrease"});
    expect(decrementButton).toHaveTextContent("−");
  });

  it("renders custom decrement children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={5}>
        <NumberFieldGroup>
          <NumberFieldDecrement>Decrement</NumberFieldDecrement>
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Decrease"})).toHaveTextContent("Decrement");
  });

  it("renders NumberFieldScrubArea with default scrub handle", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area' />
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toBeInTheDocument();
    expect(scrubArea).toHaveTextContent("⋮⋮");
  });

  it("renders NumberFieldScrubArea with custom children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area'>
            <span>Custom Scrub</span>
          </NumberFieldScrubArea>
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toHaveTextContent("Custom Scrub");
  });
});
