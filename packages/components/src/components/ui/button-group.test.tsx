import {mergeProps} from "@base-ui/react/merge-props";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {describe, expect, it, vi} from "vitest";

import {Button} from "./button";
import {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants} from "./button-group";
import styles from "./button-group.module.css";
import {CallbackText, LegacyText, RenderedLabel} from "./button-group.stories";

function requiredClass(name: string): string {
  const className = styles[name];
  if (typeof className !== "string" || className.trim().length === 0) {
    throw new Error(`Missing CSS Module class: ${name}`);
  }
  return className;
}

// Consumer fixtures: labels accept both callback props and label-specific refs.
function GroupTextLabelCallbackConsumer({labelRef}: Readonly<{labelRef: React.Ref<HTMLLabelElement>}>): React.ReactElement {
  return (
    <ButtonGroupText
      ref={labelRef}
      render={(props, state) => (
        <label
          {...props}
          htmlFor='callback-quantity'
          data-composition-slot={state.slot}
        />
      )}>
      Callback quantity
    </ButtonGroupText>
  );
}

function GroupTextLabelElementConsumer({
  labelRef,
  childRef,
  onClick,
}: Readonly<{
  labelRef: React.Ref<HTMLLabelElement>;
  childRef: React.Ref<HTMLLabelElement>;
  onClick: React.MouseEventHandler<HTMLElement>;
}>): React.ReactElement {
  return (
    <ButtonGroupText
      ref={labelRef}
      onClick={onClick}
      render={
        <label
          ref={childRef}
          htmlFor='quantity'
        />
      }>
      Quantity
    </ButtonGroupText>
  );
}

describe("ButtonGroup", () => {
  it("renders ButtonGroup components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = createRef<HTMLDivElement>();
    const textRef = createRef<HTMLDivElement>();

    // Act
    render(
      <ButtonGroup
        ref={groupRef}
        className='button-group-class'
        data-testid='button-group'>
        <button type='button'>Previous</button>
        <ButtonGroupSeparator />
        <ButtonGroupText
          ref={textRef}
          className='button-group-text-class'
          data-testid='button-group-text'>
          Navigation
        </ButtonGroupText>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group");
    const buttonGroupText = screen.getByTestId("button-group-text");

    expect(buttonGroup).toHaveClass("button-group-class");
    expect(buttonGroupText).toHaveClass("button-group-text-class");
    expect(screen.getByRole("button", {name: "Previous"})).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByTestId("button-group").querySelector("[data-slot='button-group-separator']")).toBeInTheDocument();
    expect(groupRef.current).toBe(buttonGroup);
    expect(textRef.current).toBe(buttonGroupText);
  });

  it("renders ButtonGroup with vertical orientation", () => {
    // Arrange & Act
    render(
      <ButtonGroup
        orientation='vertical'
        data-testid='button-group-vertical'>
        <button type='button'>Top</button>
        <button type='button'>Bottom</button>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group-vertical");
    expect(buttonGroup).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("button", {name: "Top"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bottom"})).toBeInTheDocument();
  });

  it("renders ButtonGroupText with asChild prop", () => {
    // Arrange & Act
    render(
      <ButtonGroup>
        <ButtonGroupText
          asChild
          data-testid='button-group-text-child'>
          <div className='custom-div'>Custom Text</div>
        </ButtonGroupText>
      </ButtonGroup>,
    );

    // Assert
    const textElement = screen.getByTestId("button-group-text-child");
    expect(textElement).toHaveClass("custom-div");
    expect(textElement.tagName).toBe("DIV");
    expect(screen.getByText("Custom Text")).toBeInTheDocument();
  });

  it.each([
    ["horizontal", requiredClass("horizontal")],
    ["vertical", requiredClass("vertical")],
  ] as const)("exposes %s orientation, styles, and an accessible group label", (orientation, orientationClass) => {
    render(
      <ButtonGroup
        orientation={orientation}
        aria-label='Page actions'>
        <Button>Previous</Button>
        <Button>Next</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", {name: "Page actions"});
    expect(group).toHaveClass(requiredClass("root"), orientationClass);
    expect(group).toHaveAttribute("data-orientation", orientation);
    expect(group).toHaveAttribute("data-slot", "button-group");
  });

  it("generates default and customized orientation classes", () => {
    expect(buttonGroupVariants()).toContain(requiredClass("root"));
    expect(buttonGroupVariants()).toContain(requiredClass("horizontal"));
    expect(buttonGroupVariants({orientation: "vertical", className: "consumer"})).toContain(requiredClass("vertical"));
    expect(buttonGroupVariants({className: "consumer"})).toContain("consumer");
  });

  it("retains sequential keyboard behavior of real grouped controls", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ButtonGroup aria-label='Actions'>
        <Button>Previous</Button>
        <ButtonGroupText>Page 1</ButtonGroupText>
        <ButtonGroupSeparator />
        <Button
          nativeButton={false}
          render={<div />}
          onClick={onClick}>
          Next
        </Button>
        <Button disabled>Unavailable</Button>
      </ButtonGroup>,
    );
    await user.tab();
    expect(screen.getByRole("button", {name: "Previous"})).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next"})).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByRole("button", {name: "Unavailable"})).not.toHaveFocus();
  });

  it("merges legacy child refs, events, classes, and preserves child content", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLSpanElement>();
    const childRef = createRef<HTMLSpanElement>();
    const calls: string[] = [];
    const {unmount} = render(
      <ButtonGroupText
        asChild
        ref={wrapperRef}
        className='wrapper'
        onClick={() => calls.push("wrapper")}>
        <span
          ref={childRef}
          className='child'
          onClick={() => calls.push("child")}>
          Quantity
        </span>
      </ButtonGroupText>,
    );
    const text = screen.getByText("Quantity");
    expect(wrapperRef.current).toBe(text);
    expect(childRef.current).toBe(text);
    expect(text).toHaveClass(requiredClass("text"), "wrapper", "child");
    expect(text).toHaveAttribute("data-slot", "button-group-text");
    await user.click(text);
    expect(calls).toEqual(["child", "wrapper"]);
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("supports canonical render elements with both refs and wrapper content", async () => {
    const user = userEvent.setup();
    const wrapperRef = createRef<HTMLLabelElement>();
    const childRef = createRef<HTMLLabelElement>();
    const onClick = vi.fn();
    const {unmount} = render(
      <>
        <GroupTextLabelElementConsumer
          labelRef={wrapperRef}
          childRef={childRef}
          onClick={onClick}
        />
        <input id='quantity' />
      </>,
    );
    const text = screen.getByText("Quantity");
    expect(text.tagName).toBe("LABEL");
    expect(wrapperRef.current).toBe(text);
    expect(childRef.current).toBe(text);
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(wrapperRef.current?.control).toBe(screen.getByLabelText("Quantity"));
    await user.click(text);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Quantity")).toHaveFocus();
    unmount();
    expect(wrapperRef.current).toBeNull();
    expect(childRef.current).toBeNull();
  });

  it("accepts label callback consumer props and forwards the correct label ref", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLLabelElement>();
    const {unmount} = render(
      <>
        <GroupTextLabelCallbackConsumer labelRef={ref} />
        <input id='callback-quantity' />
      </>,
    );
    const label = screen.getByText("Callback quantity");
    const input = screen.getByLabelText("Callback quantity");
    expect(ref.current).toBe(label);
    expect(ref.current?.control).toBe(input);
    expect(label).toHaveAttribute("data-composition-slot", "button-group-text");
    await user.click(label);
    expect(input).toHaveFocus();
    unmount();
    expect(ref.current).toBeNull();
  });

  it("exposes text slot state to callback renders with props and ref intact", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroupText
        ref={ref}
        render={(props, state) => (
          <div
            {...props}
            aria-label={state.slot}
          />
        )}>
        Callback text
      </ButtonGroupText>,
    );
    const text = screen.getByLabelText("button-group-text");
    expect(text).toHaveTextContent("Callback text");
    expect(text).toHaveClass(requiredClass("text"));
    expect(ref.current).toBe(text);
  });

  it.each([true, false])("honors child event cancellation for legacy=%s composition", async (asChild) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const child = (
      <span
        {...mergeProps<"span">(
          {},
          {
            onClick: (event) => event.preventBaseUIHandler(),
          },
        )}>
        Cancelled
      </span>
    );
    render(
      <ButtonGroupText
        asChild={asChild}
        render={asChild ? undefined : child}
        onClick={onClick}>
        {asChild ? child : undefined}
      </ButtonGroupText>,
    );
    await user.click(screen.getByText("Cancelled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps plain-text legacy children in the default div", () => {
    render(<ButtonGroupText asChild>Fallback</ButtonGroupText>);
    const text = screen.getByText("Fallback");
    expect(text.tagName).toBe("DIV");
    expect(text).toHaveAttribute("data-slot", "button-group-text");
  });

  it("keeps fragment legacy children inside the default text div", () => {
    render(
      <ButtonGroupText asChild>
        <>
          <span>Fragment content</span>
        </>
      </ButtonGroupText>,
    );
    expect(screen.getByText("Fragment content").parentElement).toHaveAttribute("data-slot", "button-group-text");
    expect(screen.getByText("Fragment content").parentElement?.tagName).toBe("DIV");
  });

  it.each(["horizontal", "vertical"] as const)("forwards %s separator orientation, classes, and ref", (orientation) => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ButtonGroupSeparator
        ref={ref}
        orientation={orientation}
        className='consumer'
      />,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", orientation);
    expect(separator).toHaveAttribute("data-orientation", orientation);
    expect(separator).toHaveClass(requiredClass("separator"), "consumer");
    expect(ref.current).toBe(separator);
  });

  it("defaults the separator to the vertical axis for a horizontal group", () => {
    render(<ButtonGroupSeparator />);
    expect(screen.getByRole("separator")).toHaveAttribute("data-orientation", "vertical");
  });

  it("preserves label association and keyboard semantics in real composition stories", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RenderedLabel.render />
        <CallbackText.render />
        <LegacyText.render />
      </>,
    );
    const input = screen.getByRole("spinbutton", {name: "Quantity"});
    await user.click(screen.getByText("Quantity"));
    expect(input).toHaveFocus();
    expect(screen.getByLabelText("button-group-text")).toHaveTextContent("Page 1 of 5");
    expect(screen.getByRole("button", {name: "Next"}).tagName).toBe("DIV");
    expect(screen.getByRole("button", {name: "Last page"})).toBeDisabled();
    expect(screen.getByText("Display").tagName).toBe("SPAN");
    expect(screen.getByRole("button", {name: "Compact"})).toHaveAttribute("data-size", "xs");
  });
});
