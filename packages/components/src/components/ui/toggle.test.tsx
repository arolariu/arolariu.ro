import {Button as BaseButton} from "@base-ui/react/button";
import {Toggle as BaseToggle} from "@base-ui/react/toggle";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Toggle,
  toggleVariants,
  type ToggleProps,
  type ToggleState,
  type ToggleVariant,
  type ToggleSize,
  type ToggleVariantOptions,
} from "./toggle";

describe("Toggle", () => {
  it("exports named visual props and actual primitive state without facade-only state fields", () => {
    expect(Toggle.displayName).toBe("Toggle");
    expect(typeof toggleVariants).toBe("function");
    expectTypeOf<ToggleProps>().toEqualTypeOf<Toggle.Props>();
    expectTypeOf<ToggleState>().toEqualTypeOf<BaseToggle.State>();
    expectTypeOf<Toggle.State>().toEqualTypeOf<ToggleState>();
    expectTypeOf<ToggleVariant>().toEqualTypeOf<"default" | "outline">();
    expectTypeOf<ToggleSize>().toEqualTypeOf<"sm" | "default" | "lg">();
    expectTypeOf<ToggleVariantOptions>().toEqualTypeOf<Readonly<ToggleVariantOptions>>();
    expectTypeOf<React.ComponentRef<typeof Toggle>>().toEqualTypeOf<HTMLElement>();
  });

  it("uses actual pressed state in render and class callbacks after keyboard activation", async () => {
    const user = userEvent.setup();
    render(
      <Toggle
        aria-label='Live pressed'
        variant='outline'
        size='sm'
        className={(state) => (state.pressed ? "pressed" : "released")}
        render={(props, state) => (
          <button
            {...props}
            data-current={String(state.pressed)}
          />
        )}>
        Bold
      </Toggle>,
    );
    const control = screen.getByRole("button", {name: "Live pressed"});
    expect(control).toHaveAttribute("data-current", "false");
    expect(control).toHaveClass("released");
    expect(control).toHaveTextContent("Bold");
    await user.tab();
    await user.keyboard(" ");
    expect(control).toHaveAttribute("data-current", "true");
    expect(control).toHaveClass("pressed");
    expect(control).toHaveAttribute("data-variant", "outline");
    expect(control).toHaveAttribute("data-size", "sm");
  });

  it("preserves native button type/form behavior and merged render element refs/handlers", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const rootClick = vi.fn();
    const childClick = vi.fn();
    const submit = vi.fn<React.FormEventHandler<HTMLFormElement>>((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Toggle
          ref={rootRef}
          aria-label='Native toggle'
          onClick={rootClick}
          render={
            <button
              ref={childRef}
              onClick={childClick}
              data-child='kept'
            />
          }>
          Child content
        </Toggle>
      </form>,
    );
    const control = screen.getByRole("button", {name: "Native toggle"});
    expect(control).toHaveAttribute("type", "button");
    expect(control).toHaveTextContent("Child content");
    expect(control).toHaveAttribute("data-child", "kept");
    expect(rootRef.current).toBe(control);
    expect(childRef.current).toBe(control);
    await user.click(control);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(submit).not.toHaveBeenCalled();
  });

  it("supports non-native targets with accurate refs and Enter/Space interaction", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLSpanElement>();
    render(
      <Toggle
        ref={rootRef}
        nativeButton={false}
        aria-label='Span toggle'
        render={<span ref={childRef} />}>
        Compose
      </Toggle>,
    );
    const control = screen.getByRole("button", {name: "Span toggle"});
    expect(control.tagName).toBe("SPAN");
    expect(rootRef.current).toBe(control);
    expect(childRef.current).toBe(control);
    expect(control).not.toHaveAttribute("type");
    await user.tab();
    expect(control).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(control).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(control).toHaveAttribute("aria-pressed", "false");
  });

  it("passes disabled primitive state to callbacks and blocks non-native activation", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <Toggle
        nativeButton={false}
        disabled
        aria-label='Disabled span'
        onPressedChange={change}
        className={(state) => (state.disabled ? "disabled-toggle" : "enabled-toggle")}
        render={(props, state) => (
          <span
            {...props}
            data-disabled-state={String(state.disabled)}
          />
        )}
      />,
    );
    const control = screen.getByRole("button", {name: "Disabled span"});
    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(control).toHaveAttribute("data-disabled-state", "true");
    expect(control).toHaveClass("disabled-toggle");
    await user.click(control);
    control.focus();
    await user.keyboard("{Enter} ");
    expect(change).not.toHaveBeenCalled();
    expect(control).toHaveAttribute("aria-pressed", "false");
  });

  it("retains original boolean/details callbacks and supports cancellation", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<Toggle.Props["onPressedChange"]>>((_pressed, details) => details.cancel());
    render(
      <Toggle
        aria-label='Canceled press'
        onPressedChange={change}>
        Cancel
      </Toggle>,
    );
    const control = screen.getByRole("button", {name: "Canceled press"});
    await user.click(control);
    expect(change).toHaveBeenCalledWith(true, expect.objectContaining({reason: "none", isCanceled: true}));
    expect(control).toHaveAttribute("aria-pressed", "false");
  });

  it("honors render element and root handler cancellation", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const rootClick = vi.fn();
    const {rerender} = render(
      <Toggle
        aria-label='Prevent press'
        onClick={rootClick}
        onPressedChange={change}
        render={<BaseButton onClick={(event) => event.preventBaseUIHandler()} />}
      />,
    );
    const control = screen.getByRole("button", {name: "Prevent press"});
    await user.click(control);
    expect(rootClick).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
    rerender(
      <Toggle
        aria-label='Prevent press'
        onPressedChange={change}
        onClick={(event) => event.preventBaseUIHandler()}
      />,
    );
    await user.click(control);
    expect(change).not.toHaveBeenCalled();
  });

  it("reflects controlled rerenders in render/class callbacks without independent pressed state", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const view = (pressed: boolean): React.JSX.Element => (
      <Toggle
        aria-label='Controlled callback'
        pressed={pressed}
        onPressedChange={change}
        className={(state) => (state.pressed ? "selected" : "unselected")}
        render={(props, state) => (
          <button
            {...props}
            data-current={String(state.pressed)}
          />
        )}
      />
    );
    const {rerender} = render(view(false));
    const control = screen.getByRole("button", {name: "Controlled callback"});
    await user.click(control);
    expect(change).toHaveBeenCalledWith(true, expect.objectContaining({reason: "none"}));
    expect(control).toHaveAttribute("data-current", "false");
    rerender(view(true));
    expect(control).toHaveAttribute("data-current", "true");
    expect(control).toHaveClass("selected");
  });

  it("retains non-native ref callback cleanup", () => {
    const cleanup = vi.fn();
    const callback = vi.fn<React.RefCallback<HTMLElement>>(() => cleanup);
    const {unmount} = render(
      <Toggle
        nativeButton={false}
        ref={callback}
        render={<span />}
        aria-label='Ref cleanup'
      />,
    );
    expect(callback).toHaveBeenCalledWith(screen.getByRole("button", {name: "Ref cleanup"}));
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("renders without crashing", () => {
    // Arrange
    render(<Toggle aria-label='Bold'>Bold</Toggle>);

    // Assert
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
  });

  it("forwards its ref to the toggle DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <Toggle
        ref={ref}
        aria-label='Forwarded toggle'>
        Toggle
      </Toggle>,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("button", {name: "Forwarded toggle"}));
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Styled toggle'
        className='custom-toggle'>
        Toggle
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Styled toggle"})).toHaveClass("custom-toggle");
  });

  it("updates pressed state when clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const handlePressedChange = vi.fn<(pressed: boolean) => void>();

    render(
      <Toggle
        aria-label='Italic'
        onPressedChange={handlePressedChange}>
        Italic
      </Toggle>,
    );

    const toggle = screen.getByRole("button", {name: "Italic"});

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(handlePressedChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(handlePressedChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("marks disabled toggles with data-disabled", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Disabled toggle'
        disabled>
        Disabled
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Disabled toggle"})).toHaveAttribute("data-disabled");
  });

  it("does not call onPressedChange when disabled", async () => {
    // Arrange
    const user = userEvent.setup();
    const handlePressedChange = vi.fn<(pressed: boolean) => void>();

    render(
      <Toggle
        aria-label='Disabled callback toggle'
        disabled
        onPressedChange={handlePressedChange}>
        Disabled callback
      </Toggle>,
    );

    const toggle = screen.getByRole("button", {name: "Disabled callback toggle"});

    // Act
    await user.click(toggle);

    // Assert
    expect(handlePressedChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("supports keyboard toggling with the enter key", async () => {
    // Arrange
    const user = userEvent.setup();

    render(<Toggle aria-label='Keyboard toggle'>Keyboard</Toggle>);

    const toggle = screen.getByRole("button", {name: "Keyboard toggle"});
    toggle.focus();

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes accessible toggle button semantics", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Accessible toggle'
        pressed>
        Accessible
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Accessible toggle"})).toHaveAttribute("aria-pressed", "true");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handlePressedChange = vi.fn<(pressed: boolean) => void>();

    function ControlledToggle(): React.JSX.Element {
      const [pressed, setPressed] = React.useState(false);

      return (
        <Toggle
          pressed={pressed}
          aria-label='Controlled toggle'
          onPressedChange={(nextPressed) => {
            setPressed(nextPressed);
            handlePressedChange(nextPressed);
          }}>
          Controlled
        </Toggle>
      );
    }

    render(<ControlledToggle />);

    const toggle = screen.getByRole("button", {name: "Controlled toggle"});

    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(toggle);

    // Assert
    expect(handlePressedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("computes outline and default variant classes", () => {
    // Arrange
    const defaultClasses = toggleVariants();

    // Act
    const outlineClasses = toggleVariants({variant: "outline"});

    // Assert
    expect(outlineClasses).not.toBe(defaultClasses);
  });

  it("computes small and large size classes", () => {
    // Arrange
    const defaultClasses = toggleVariants();

    // Act
    const smallClasses = toggleVariants({size: "sm"});
    const largeClasses = toggleVariants({size: "lg"});

    // Assert
    expect(smallClasses).not.toBe(defaultClasses);
    expect(largeClasses).not.toBe(defaultClasses);
    expect(smallClasses).not.toBe(largeClasses);
  });
});
